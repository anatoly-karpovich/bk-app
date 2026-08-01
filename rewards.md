# Implementation Plan: Reusable Resources and Reward Resolution

## Goal

Refactor the current Journey reward system so that:

1. A project can define both currencies and items through one reusable resource catalog.
2. Rewards are no longer limited to currencies.
3. Reward distribution supports three modes:
   - grant every configured reward;
   - select exactly one reward by relative weights;
   - roll every reward independently by probability.

4. Probability and weighted selection do not depend directly on `Math.random()`.
5. The source of randomness is replaceable through dependency injection.
6. The implementation is reusable by Journey and future games.
7. Existing Journey configurations can be migrated with minimal behavioral changes.

Do not add or modify tests as part of this task.

---

# 1. Target Architecture

Create a reusable rewards module outside Journey.

Suggested location:

```text
backend/src/modules/rewards/
├── domain/
│   ├── reward.types.ts
│   ├── randomizer.ts
│   └── reward.errors.ts
├── services/
│   ├── RewardResolver.ts
│   └── ResourceInventoryService.ts
├── infrastructure/
│   └── CryptoRandomizer.ts
├── reward.schemas.ts
└── index.ts
```

The intended dependency flow is:

```text
Game module
    ↓
RewardResolver
    ↓
Randomizer interface
    ↓
CryptoRandomizer
    ↓
node:crypto
```

Applying resolved rewards is a separate responsibility:

```text
RewardResolver
    ↓
ResourceAmount[]
    ↓
ResourceInventoryService
    ↓
updated player holdings
```

The game module must not know how probabilities or weighted selections are implemented.

---

# 2. Replace Currency-Only Configuration with Resource Catalog

## Current concept

The project currently defines currencies approximately as:

```ts
interface ConfigCurrency {
  id: string;
  label: string;
}

interface AppConfig {
  currencies: ConfigCurrency[];
}
```

This makes Journey and other modules currency-specific.

## Target concept

Replace the currency-only catalog with a generic resource catalog.

```ts
export type ResourceType = "currency" | "item";

export interface ConfigResource {
  id: string;
  type: ResourceType;
  label: string;
  unitLabel?: string;
}
```

Update the application config:

```ts
export interface AppConfig {
  resources: ConfigResource[];
}
```

Example:

```ts
const resources: ConfigResource[] = [
  {
    id: "chips",
    type: "currency",
    label: "Chips",
  },
  {
    id: "ekr",
    type: "currency",
    label: "EKR",
  },
  {
    id: "valor-sign",
    type: "item",
    label: "Sign of Valor",
    unitLabel: "pcs.",
  },
  {
    id: "artifact",
    type: "item",
    label: "Artifact",
    unitLabel: "pcs.",
  },
];
```

## Validation requirements

Resource configuration must enforce:

- `id` is a non-empty string;
- `id` values are unique across the entire catalog;
- `label` is a non-empty string;
- `type` is either `"currency"` or `"item"`;
- `unitLabel` is optional;
- currencies and items must not be stored in separate catalogs.

## Naming rule

Use `resourceId` everywhere in new reward structures.

Do not introduce new fields named:

```ts
currencyId;
itemId;
```

Both resource types must use:

```ts
resourceId;
```

---

# 3. Introduce Generic Reward Amount

Create:

```ts
export interface ResourceAmount {
  resourceId: string;
  amount: number;
}
```

Example:

```ts
const reward: ResourceAmount = {
  resourceId: "valor-sign",
  amount: 5,
};
```

## Amount rules

Initial implementation rules:

- reward amounts must be finite numbers;
- zero is invalid;
- currency rewards may be positive or negative where existing Journey mechanics require it;
- item rewards must initially be positive only;
- item removal must not be hidden inside reward resolution;
- item removal can be introduced later as a separate inventory operation.

Because validating the sign depends on the referenced resource type, schema validation alone may be insufficient. Perform cross-reference validation after parsing the config.

Suggested validation function:

```ts
export function validateResourceAmount(
  reward: ResourceAmount,
  resourcesById: ReadonlyMap<string, ConfigResource>,
): void {
  const resource = resourcesById.get(reward.resourceId);

  if (!resource) {
    throw new Error(`Unknown resource: ${reward.resourceId}`);
  }

  if (!Number.isFinite(reward.amount) || reward.amount === 0) {
    throw new Error(`Reward amount for "${reward.resourceId}" must be a finite non-zero number`);
  }

  if (resource.type === "item" && reward.amount < 0) {
    throw new Error(`Item reward "${reward.resourceId}" cannot have a negative amount`);
  }
}
```

Keep validation errors consistent with the error style already used in the backend.

---

# 4. Define Reward Pool Types

Create a discriminated union describing how rewards are resolved.

```ts
export type RewardPool = AllRewardPool | WeightedOneRewardPool | IndependentRewardPool;
```

## 4.1 Grant all rewards

```ts
export interface AllRewardPool {
  mode: "all";
  rewards: ResourceAmount[];
}
```

Behavior:

- return every configured reward;
- preserve configuration order;
- do not use the randomizer.

Example:

```ts
const pool: AllRewardPool = {
  mode: "all",
  rewards: [
    {
      resourceId: "chips",
      amount: 10,
    },
    {
      resourceId: "valor-sign",
      amount: 2,
    },
  ],
};
```

---

## 4.2 Select one reward by weight

```ts
export interface WeightedRewardOption {
  reward: ResourceAmount | null;
  weight: number;
}

export interface WeightedOneRewardPool {
  mode: "weighted_one";
  options: WeightedRewardOption[];
}
```

Behavior:

- choose exactly one option;
- weights are relative;
- weights do not need to sum to 100;
- a `null` reward explicitly means that nothing is granted;
- return either one reward or an empty array.

Example:

```ts
const pool: WeightedOneRewardPool = {
  mode: "weighted_one",
  options: [
    {
      reward: {
        resourceId: "chips",
        amount: 10,
      },
      weight: 70,
    },
    {
      reward: {
        resourceId: "valor-sign",
        amount: 1,
      },
      weight: 25,
    },
    {
      reward: {
        resourceId: "artifact",
        amount: 1,
      },
      weight: 4,
    },
    {
      reward: null,
      weight: 1,
    },
  ],
};
```

Validation requirements:

- `options` must not be empty;
- each weight must be finite and greater than zero;
- total weight must be finite and greater than zero;
- no requirement to normalize weights;
- duplicated resources may be allowed because separate weighted outcomes can intentionally grant different amounts of the same resource.

---

## 4.3 Roll every reward independently

Use basis points rather than floating-point percentages.

```ts
export const MAX_CHANCE_BPS = 10_000;

export interface IndependentRewardOption {
  reward: ResourceAmount;
  chanceBps: number;
}

export interface IndependentRewardPool {
  mode: "independent";
  options: IndependentRewardOption[];
}
```

Meaning:

```text
10000 = 100%
5000  = 50%
500   = 5%
100   = 1%
1     = 0.01%
```

Behavior:

- roll every option separately;
- every successful option is returned;
- zero, one, or many rewards may be returned;
- preserve option order in the output.

Example:

```ts
const pool: IndependentRewardPool = {
  mode: "independent",
  options: [
    {
      reward: {
        resourceId: "ekr",
        amount: 10,
      },
      chanceBps: 10_000,
    },
    {
      reward: {
        resourceId: "valor-sign",
        amount: 1,
      },
      chanceBps: 5_000,
    },
    {
      reward: {
        resourceId: "artifact",
        amount: 1,
      },
      chanceBps: 1_000,
    },
  ],
};
```

Validation requirements:

- `options` may be empty only if empty reward pools are already accepted by the existing configuration conventions; otherwise require at least one option;
- `chanceBps` must be an integer;
- `chanceBps` must be between `0` and `10_000`, inclusive;
- a chance of `0` is valid and always fails;
- a chance of `10_000` is valid and always succeeds.

---

# 5. Define the Replaceable Randomizer Contract

Create a high-level interface.

`RewardResolver` must depend on this interface and must not import `Math.random`, `node:crypto`, or any concrete random implementation.

```ts
export interface Randomizer {
  succeeds(chanceBps: number): boolean;

  pickWeightedIndex(weights: readonly number[]): number;
}
```

## Why the interface is high-level

The consumer needs two domain operations:

1. determine whether an event succeeds for a configured probability;
2. select one option using relative weights.

The resolver should not know:

- the random integer range;
- how thresholds are calculated;
- whether the implementation uses `Math.random`;
- whether the implementation uses `crypto.randomInt`;
- whether the implementation later uses a seeded generator;
- whether the implementation later introduces another probability strategy.

## Contract requirements

### `succeeds(chanceBps)`

- accepts an integer between `0` and `10_000`;
- returns `false` for `0`;
- returns `true` for `10_000`;
- otherwise performs an independent probability roll.

### `pickWeightedIndex(weights)`

- accepts a non-empty list;
- every weight must be finite and greater than zero;
- returns an integer index;
- the returned index must be within the input array bounds;
- probability of choosing an index must be proportional to its weight.

---

# 6. Implement Production Randomizer

Create:

```ts
import { randomInt } from "node:crypto";

import { MAX_CHANCE_BPS, type Randomizer } from "../domain/randomizer";
```

Suggested implementation:

```ts
export class CryptoRandomizer implements Randomizer {
  succeeds(chanceBps: number): boolean {
    this.assertChanceBps(chanceBps);

    if (chanceBps === 0) {
      return false;
    }

    if (chanceBps === MAX_CHANCE_BPS) {
      return true;
    }

    return randomInt(MAX_CHANCE_BPS) < chanceBps;
  }

  pickWeightedIndex(weights: readonly number[]): number {
    if (weights.length === 0) {
      throw new Error("Weighted selection requires at least one weight");
    }

    let totalWeight = 0;

    for (const weight of weights) {
      if (!Number.isSafeInteger(weight) || weight <= 0) {
        throw new Error("Weighted selection requires positive safe integer weights");
      }

      totalWeight += weight;
    }

    if (!Number.isSafeInteger(totalWeight)) {
      throw new Error("Total weight must be a safe integer");
    }

    const roll = randomInt(totalWeight);

    let cumulativeWeight = 0;

    for (let index = 0; index < weights.length; index += 1) {
      cumulativeWeight += weights[index];

      if (roll < cumulativeWeight) {
        return index;
      }
    }

    throw new Error("Weighted selection failed to resolve an index");
  }

  private assertChanceBps(chanceBps: number): void {
    if (!Number.isInteger(chanceBps) || chanceBps < 0 || chanceBps > MAX_CHANCE_BPS) {
      throw new Error(`chanceBps must be an integer between 0 and ${MAX_CHANCE_BPS}`);
    }
  }
}
```

## Weight representation decision

Prefer positive integer weights in configuration.

This allows direct use of:

```ts
randomInt(totalWeight);
```

without floating-point boundary behavior.

The TypeScript field remains `number`, but runtime validation must require:

```ts
Number.isSafeInteger(weight) && weight > 0;
```

---

# 7. Implement RewardResolver

Create a stateless resolver whose only dependency is `Randomizer`.

```ts
export class RewardResolver {
  constructor(private readonly randomizer: Randomizer) {}

  resolve(pool: RewardPool): ResourceAmount[] {
    switch (pool.mode) {
      case "all":
        return this.resolveAll(pool);

      case "weighted_one":
        return this.resolveWeightedOne(pool);

      case "independent":
        return this.resolveIndependent(pool);

      default:
        return this.assertNever(pool);
    }
  }

  private resolveAll(pool: AllRewardPool): ResourceAmount[] {
    return pool.rewards.map((reward) => ({ ...reward }));
  }

  private resolveWeightedOne(pool: WeightedOneRewardPool): ResourceAmount[] {
    const index = this.randomizer.pickWeightedIndex(pool.options.map((option) => option.weight));

    const reward = pool.options[index].reward;

    return reward ? [{ ...reward }] : [];
  }

  private resolveIndependent(pool: IndependentRewardPool): ResourceAmount[] {
    return pool.options
      .filter((option) => this.randomizer.succeeds(option.chanceBps))
      .map((option) => ({
        ...option.reward,
      }));
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported reward pool: ${JSON.stringify(value)}`);
  }
}
```

## Resolver requirements

The resolver:

- must not mutate the input pool;
- must return new reward objects;
- must not apply balance limits;
- must not update Journey state;
- must not resolve resource labels;
- must not validate the project configuration every time it runs;
- must not call a database;
- must not contain Journey-specific behavior;
- must not contain jackpot winner selection.

The resolver answers only:

> Which configured rewards were successfully resolved?

---

# 8. Introduce Generic Resource Holdings

Replace Journey-specific balance naming with generic resource holdings where practical.

Suggested type:

```ts
export type ResourceHoldings = Record<string, number>;
```

Example:

```ts
const holdings: ResourceHoldings = {
  chips: 20,
  ekr: 5,
  "valor-sign": 3,
};
```

Avoid encoding currency or item semantics into the storage shape.

Do not require every configured resource to exist in the record. Missing keys should be treated as zero.

Suggested helper:

```ts
export function getResourceAmount(holdings: Readonly<ResourceHoldings>, resourceId: string): number {
  return holdings[resourceId] ?? 0;
}
```

---

# 9. Implement ResourceInventoryService

Reward resolution and reward application must remain separate.

Create a service responsible for applying resolved resource amounts to holdings.

Suggested types:

```ts
export interface ResourceLimit {
  resourceId: string;
  min?: number;
  max?: number;
}

export interface AppliedResourceReward {
  requested: ResourceAmount;
  applied: ResourceAmount;
}

export interface ApplyRewardsResult {
  holdings: ResourceHoldings;
  rewards: AppliedResourceReward[];
}
```

Suggested service:

```ts
export class ResourceInventoryService {
  apply(
    currentHoldings: Readonly<ResourceHoldings>,
    requestedRewards: readonly ResourceAmount[],
    limits: readonly ResourceLimit[] = [],
  ): ApplyRewardsResult {
    const holdings: ResourceHoldings = {
      ...currentHoldings,
    };

    const limitsByResourceId = new Map(limits.map((limit) => [limit.resourceId, limit]));

    const rewards: AppliedResourceReward[] = [];

    for (const requested of requestedRewards) {
      const current = holdings[requested.resourceId] ?? 0;

      const limit = limitsByResourceId.get(requested.resourceId);

      let next = current + requested.amount;

      if (limit?.min !== undefined) {
        next = Math.max(limit.min, next);
      }

      if (limit?.max !== undefined) {
        next = Math.min(limit.max, next);
      }

      const appliedAmount = next - current;

      holdings[requested.resourceId] = next;

      rewards.push({
        requested: {
          ...requested,
        },
        applied: {
          resourceId: requested.resourceId,
          amount: appliedAmount,
        },
      });
    }

    return {
      holdings,
      rewards,
    };
  }
}
```

## Important behavior

If multiple rewards for the same resource are resolved, apply them in order.

Example:

```ts
[
  {
    resourceId: "chips",
    amount: 10,
  },
  {
    resourceId: "chips",
    amount: -3,
  },
];
```

They must be applied sequentially.

This preserves reward history and makes limit application deterministic.

## Limits

Current Journey `maxPrizes` should evolve into generic per-resource limits.

Suggested target:

```ts
resourceLimits: ResourceLimit[];
```

Example:

```ts
const resourceLimits: ResourceLimit[] = [
  {
    resourceId: "chips",
    min: 0,
    max: 30,
  },
  {
    resourceId: "ekr",
    min: 0,
  },
];
```

Items can remain unlimited by omitting a limit.

---

# 10. Add Reward Schemas

Implement runtime schemas using the schema library already used by the project.

Conceptual representation:

```ts
const resourceAmountSchema = z.object({
  resourceId: z.string().min(1),
  amount: z
    .number()
    .finite()
    .refine((value) => value !== 0),
});

const allRewardPoolSchema = z.object({
  mode: z.literal("all"),
  rewards: z.array(resourceAmountSchema),
});

const weightedRewardOptionSchema = z.object({
  reward: resourceAmountSchema.nullable(),
  weight: z.number().int().positive().safe(),
});

const weightedOneRewardPoolSchema = z.object({
  mode: z.literal("weighted_one"),
  options: z.array(weightedRewardOptionSchema).min(1),
});

const independentRewardOptionSchema = z.object({
  reward: resourceAmountSchema,
  chanceBps: z.number().int().min(0).max(10_000),
});

const independentRewardPoolSchema = z.object({
  mode: z.literal("independent"),
  options: z.array(independentRewardOptionSchema),
});

export const rewardPoolSchema = z.discriminatedUnion("mode", [
  allRewardPoolSchema,
  weightedOneRewardPoolSchema,
  independentRewardPoolSchema,
]);
```

Adapt the implementation to the actual schema library and repository conventions.

## Cross-reference validation

After schema parsing, validate that:

- every `resourceId` exists in `AppConfig.resources`;
- item reward amounts are positive;
- any game-specific negative reward rules remain valid;
- configured resource limits reference existing resources;
- duplicate resource IDs are rejected in the resource catalog.

Do not place project catalog lookups inside `RewardResolver`.

---

# 11. Update Journey Domain Types

## Current direction

Journey currently contains currency-specific reward structures such as:

```ts
interface JourneyCurrencyValue {
  currencyId: string;
  value: number;
}

interface JourneyRulesCell {
  rewards: JourneyCurrencyValue[];
}
```

## Target direction

Remove `JourneyCurrencyValue` after migration.

Use shared reward types:

```ts
import type { RewardPool, ResourceAmount, ResourceHoldings, ResourceLimit } from "../../rewards";
```

Update Journey cell:

```ts
export interface JourneyRulesCell {
  rewardPool: RewardPool;
}
```

Update Journey rules:

```ts
export interface JourneyRules {
  initialRewardPool: RewardPool;

  jackpot: {
    rewardPool: RewardPool;
  };

  resourceLimits?: ResourceLimit[];
}
```

If initial rewards should always be guaranteed, narrow their type:

```ts
export interface JourneyRules {
  initialRewardPool: AllRewardPool;

  jackpot: {
    rewardPool: RewardPool;
  };

  resourceLimits?: ResourceLimit[];
}
```

Prefer generic `RewardPool` unless there is a clear domain reason to restrict a specific reward location.

Update player state:

```ts
export interface JourneyPlayerState {
  resources: ResourceHoldings;
}
```

If renaming persisted fields would cause an unnecessarily large migration, the field can temporarily remain named `balance`:

```ts
export interface JourneyPlayerState {
  balance: ResourceHoldings;
}
```

Do not maintain a type named `JourneyBalance` if it is only an alias for generic resource holdings.

---

# 12. Update JourneyEngine Dependencies

Inject shared services into `JourneyEngine`.

Suggested constructor:

```ts
export class JourneyEngine {
  constructor(
    private readonly rewardResolver: RewardResolver,

    private readonly inventoryService: ResourceInventoryService,
  ) {}
}
```

If `JourneyEngine` already has constructor dependencies, append these using the current dependency injection style.

Do not instantiate concrete dependencies inside `JourneyEngine`:

```ts
// Do not do this:
const resolver = new RewardResolver(new CryptoRandomizer());
```

Concrete composition belongs in the application composition root, module factory, or service bootstrap.

---

# 13. Update Journey Reward Flow

For every place where Journey currently grants an array of rewards directly, replace it with two explicit steps.

## Step 1: Resolve the reward pool

```ts
const requestedRewards = this.rewardResolver.resolve(cell.rewardPool);
```

## Step 2: Apply resolved rewards

```ts
const result = this.inventoryService.apply(player.balance, requestedRewards, rules.resourceLimits);
```

## Step 3: Update state

```ts
player.balance = result.holdings;
```

## Step 4: Preserve history semantics

Journey currently distinguishes requested and applied rewards.

Keep that behavior.

Suggested mapping:

```ts
const requestedRewards = result.rewards.map((entry) => entry.requested);

const appliedRewards = result.rewards.map((entry) => entry.applied);
```

If zero applied amounts are currently omitted from history, preserve that behavior explicitly:

```ts
const appliedRewards = result.rewards.map((entry) => entry.applied).filter((reward) => reward.amount !== 0);
```

Do not silently change the current Journey event or history contract.

---

# 14. Update Initial Rewards

Legacy initial rewards currently behave as “grant everything”.

Represent them as:

```ts
const initialRewardPool: AllRewardPool = {
  mode: "all",
  rewards: [
    {
      resourceId: "chips",
      amount: 10,
    },
  ],
};
```

At game initialization:

```ts
const initialRewards = rewardResolver.resolve(rules.initialRewardPool);

const initialResult = inventoryService.apply({}, initialRewards, rules.resourceLimits);
```

Use the returned holdings as the player's initial resource state.

---

# 15. Update Cell Rewards

Legacy cell configuration:

```ts
{
  rewards: [
    {
      currencyId: "chips",
      value: 5,
    },
  ],
}
```

Target configuration:

```ts
{
  rewardPool: {
    mode: "all",
    rewards: [
      {
        resourceId: "chips",
        amount: 5,
      },
    ],
  },
}
```

Independent example:

```ts
{
  rewardPool: {
    mode: "independent",
    options: [
      {
        reward: {
          resourceId: "ekr",
          amount: 10,
        },
        chanceBps: 10_000,
      },
      {
        reward: {
          resourceId: "valor-sign",
          amount: 1,
        },
        chanceBps: 5_000,
      },
      {
        reward: {
          resourceId: "artifact",
          amount: 1,
        },
        chanceBps: 1_000,
      },
    ],
  },
}
```

Weighted example:

```ts
{
  rewardPool: {
    mode: "weighted_one",
    options: [
      {
        reward: {
          resourceId: "chips",
          amount: 10,
        },
        weight: 70,
      },
      {
        reward: {
          resourceId: "valor-sign",
          amount: 1,
        },
        weight: 25,
      },
      {
        reward: {
          resourceId: "artifact",
          amount: 1,
        },
        weight: 5,
      },
    ],
  },
}
```

---

# 16. Update Jackpot Flow

Keep current jackpot winner selection unchanged.

The responsibility split must be:

```text
Journey decides who won the jackpot
    ↓
RewardResolver decides what the winner receives
    ↓
ResourceInventoryService applies the result
```

Suggested flow:

```ts
const winner =
  this.selectJackpotWinner(...);

const requestedRewards =
  this.rewardResolver.resolve(
    rules.jackpot.rewardPool,
  );

const applicationResult =
  this.inventoryService.apply(
    winner.balance,
    requestedRewards,
    rules.resourceLimits,
  );

winner.balance =
  applicationResult.holdings;
```

Do not move jackpot participant or winner logic into the shared rewards module.

---

# 17. Add Legacy Configuration Normalization

To avoid requiring every stored configuration to be rewritten immediately, add a normalization layer.

The parser should accept legacy currency rewards and convert them to the new model.

## Legacy amount conversion

```ts
function normalizeLegacyReward(reward: JourneyCurrencyValue): ResourceAmount {
  return {
    resourceId: reward.currencyId,
    amount: reward.value,
  };
}
```

## Legacy reward list conversion

```ts
function normalizeLegacyRewards(rewards: JourneyCurrencyValue[]): AllRewardPool {
  return {
    mode: "all",
    rewards: rewards.map(normalizeLegacyReward),
  };
}
```

## Cell normalization

Conceptually:

```ts
function normalizeJourneyCell(cell: LegacyOrCurrentJourneyCell): JourneyRulesCell {
  if ("rewardPool" in cell) {
    return {
      ...cell,
      rewardPool: cell.rewardPool,
    };
  }

  return {
    ...cell,
    rewardPool: normalizeLegacyRewards(cell.rewards),
  };
}
```

## Config catalog normalization

If old app configs contain:

```ts
currencies: ConfigCurrency[];
```

normalize them to:

```ts
resources: ConfigResource[];
```

Example:

```ts
function normalizeResources(config: LegacyOrCurrentAppConfig): ConfigResource[] {
  if ("resources" in config) {
    return config.resources;
  }

  return config.currencies.map((currency) => ({
    id: currency.id,
    type: "currency" as const,
    label: currency.label,
  }));
}
```

## Migration policy

Choose one of these approaches based on how configs are stored.

### Preferred

Normalize legacy configs at the parsing boundary, then use only new types internally.

### Alternative

Run a one-time migration of persisted configs and remove legacy support immediately.

Do not spread unions of legacy and new types throughout `JourneyEngine`.

---

# 18. Update Journey Parser

`JourneyParser` must return only normalized current-domain structures.

Recommended sequence:

```text
raw config
    ↓
schema parsing
    ↓
legacy normalization
    ↓
resource cross-reference validation
    ↓
JourneyRules
```

Parser output must not contain:

```ts
currencyId;
value;
rewards;
currencies;
```

After parsing, all downstream services should receive only:

```ts
resourceId;
amount;
rewardPool;
resources;
```

---

# 19. Dependency Composition

Create concrete shared instances at the application composition boundary.

Example:

```ts
const randomizer = new CryptoRandomizer();

const rewardResolver = new RewardResolver(randomizer);

const inventoryService = new ResourceInventoryService();

const journeyEngine = new JourneyEngine(rewardResolver, inventoryService);
```

If the application uses a DI container, register:

```text
Randomizer
    -> CryptoRandomizer

RewardResolver
    -> singleton or transient
       according to current conventions

ResourceInventoryService
    -> singleton or transient
       according to current conventions

JourneyEngine
    -> existing lifecycle
```

Both shared services are stateless and can safely be singletons.

Do not make `CryptoRandomizer` global through direct imports.

---

# 20. Public Exports

Expose shared reward types and services through a module barrel.

Example:

```ts
export { MAX_CHANCE_BPS } from "./domain/randomizer";

export type { Randomizer } from "./domain/randomizer";

export type {
  AllRewardPool,
  IndependentRewardOption,
  IndependentRewardPool,
  ResourceAmount,
  ResourceHoldings,
  ResourceLimit,
  RewardPool,
  WeightedOneRewardPool,
  WeightedRewardOption,
} from "./domain/reward.types";

export { RewardResolver } from "./services/RewardResolver";

export { ResourceInventoryService } from "./services/ResourceInventoryService";

export { CryptoRandomizer } from "./infrastructure/CryptoRandomizer";
```

Avoid importing internal reward module files from Journey if a public module export exists.

---

# 21. Validation and Error Handling

Create explicit domain errors only if the repository already uses typed error classes.

Otherwise follow the existing error convention.

Potential errors:

```ts
export class InvalidChanceError extends Error {}

export class InvalidWeightError extends Error {}

export class UnknownResourceError extends Error {}

export class InvalidResourceAmountError extends Error {}
```

Do not over-engineer the first implementation.

The most important requirement is that invalid configuration fails during parsing or startup, not during a player's turn.

Runtime defensive checks should remain in `CryptoRandomizer`, but valid parsed configurations should never trigger them.

---

# 22. Formatting and Presentation

Any code that currently formats currency rewards for API responses or logs must resolve labels through the generic resource catalog.

Suggested helper:

```ts
export function formatResourceAmount(
  reward: ResourceAmount,
  resourcesById: ReadonlyMap<string, ConfigResource>,
): string {
  const resource = resourcesById.get(reward.resourceId);

  if (!resource) {
    return `${reward.resourceId}: ` + `${reward.amount}`;
  }

  const suffix = resource.unitLabel ? ` ${resource.unitLabel}` : "";

  return `${resource.label}: ` + `${reward.amount}${suffix}`;
}
```

Do not place labels inside `ResourceAmount`.

Reward instances should reference catalog resources by ID.

---

# 23. API Contract Changes

Inspect Journey response DTOs and replace currency-specific names.

Potential migration:

```ts
requestedRewards: Array<{
  currencyId: string;
  value: number;
}>;
```

becomes:

```ts
requestedRewards:
  ResourceAmount[];
```

Likewise:

```ts
appliedRewards:
  ResourceAmount[];
```

If frontend compatibility is required, choose one explicit strategy:

1. update frontend and backend together;
2. temporarily map new internal rewards to the old response shape for currency-only clients;
3. version the response DTO.

Do not expose both `currencyId` and `resourceId` indefinitely.

---

# 24. Suggested Implementation Order

Execute the refactor in this order.

## Step 1

Create generic resource types:

```ts
ConfigResource;
ResourceType;
ResourceAmount;
ResourceHoldings;
ResourceLimit;
```

## Step 2

Add the `RewardPool` discriminated union and schemas.

## Step 3

Add the `Randomizer` interface.

## Step 4

Add `CryptoRandomizer`.

## Step 5

Add `RewardResolver`.

## Step 6

Add `ResourceInventoryService`.

## Step 7

Update app config parsing from `currencies` to normalized `resources`.

## Step 8

Add legacy reward normalization:

```text
currencyId -> resourceId
value -> amount
rewards[] -> rewardPool { mode: "all" }
```

## Step 9

Update Journey domain types.

## Step 10

Inject shared services into `JourneyEngine`.

## Step 11

Replace direct reward application in cells with:

```text
resolve
    ↓
apply
    ↓
update state
    ↓
write history
```

## Step 12

Migrate initial rewards.

## Step 13

Migrate jackpot rewards without changing winner selection.

## Step 14

Update DTOs, controller output, logs, and formatting.

## Step 15

Update existing config files to the new format where practical.

## Step 16

Remove obsolete currency-only Journey types after all references are migrated.

---

# 25. Explicit Non-Goals

Do not implement the following in this task:

- tests;
- nested reward pools;
- reward pools containing other reward pools;
- pity systems;
- shuffle bags;
- player-specific probability modifiers;
- dynamic weights based on player state;
- negative item rewards;
- item consumption;
- item metadata beyond the resource catalog;
- database persistence redesign unless required by renamed fields;
- migration of unrelated game modules;
- probability analytics;
- audit storage of raw random rolls.

The architecture must allow future extension, but these features must not be included now.

---

# 26. Acceptance Criteria

The implementation is complete when all statements below are true.

1. App configuration supports resources of type `"currency"` and `"item"`.
2. Journey rewards reference resources through `resourceId`.
3. Journey no longer requires currency-specific reward types.
4. A reward pool can grant all configured rewards.
5. A reward pool can select exactly one weighted option.
6. A weighted option can explicitly resolve to no reward.
7. A reward pool can roll every option independently using `chanceBps`.
8. `RewardResolver` receives a `Randomizer` through its constructor.
9. `RewardResolver` contains no direct use of `Math.random()` or `node:crypto`.
10. The production `Randomizer` uses `node:crypto.randomInt`.
11. Reward resolution and holdings mutation are separate operations.
12. Journey preserves requested-versus-applied reward history semantics.
13. Existing legacy Journey reward arrays can be normalized to `mode: "all"`.
14. Jackpot winner selection remains Journey-specific.
15. Invalid resource references fail during config parsing or validation.
16. Items cannot receive negative reward amounts.
17. No tests are added or changed as part of this task.
18. No unrelated game modules are refactored unless required for compilation.

---

# 27. Final Design Summary

The resulting system should follow this model:

```text
AppConfig.resources
    ↓
defines currencies and items
    ↓
RewardPool
    ↓
defines potential rewards
and distribution mode
    ↓
RewardResolver
    ↓
uses injected Randomizer
    ↓
returns ResourceAmount[]
    ↓
ResourceInventoryService
    ↓
applies limits and updates
ResourceHoldings
    ↓
Journey
    ↓
orchestrates game flow
and stores history
```

The shared rewards module owns reward resolution mechanics.

Journey owns:

- when rewards are resolved;
- which reward pool applies;
- jackpot winner selection;
- player state transitions;
- Journey event and history creation.

The randomizer owns:

- probability success decisions;
- weighted option selection;
- the concrete random number source.

The inventory service owns:

- applying resolved amounts;
- enforcing resource limits;
- reporting requested and actually applied amounts.
