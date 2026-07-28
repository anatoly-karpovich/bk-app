import {
  assertValidResourceAmount,
  assertValidResourceLimits,
  type AllRewardPool,
  type Resource,
  type ResourceSnapshot,
  type RewardPool,
} from "../../rewards";
import type {
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyJackpotCountMode,
  JourneyMapCell,
  JourneyRules,
  JourneyRulesInput,
} from "./types";

const all = (...rewards: Array<{ resourceId: string; amount: number }>): AllRewardPool => ({ mode: "all", rewards });
const clone = <T>(value: T): T => structuredClone(value);
const positiveInteger = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Math.max(1, Math.trunc(Number(value))) : fallback;
const nonNegativeInteger = (value: unknown, fallback: number, max = Infinity) =>
  Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Math.trunc(Number(value)))) : fallback;

export const JOURNEY_MAX_JACKPOT_COUNT = 7;
export const DEFAULT_JOURNEY_PLAYERS_PER_JACKPOT = 3;
export const DEFAULT_JOURNEY_RULES: JourneyRules = {
  initialRewardPool: all({ resourceId: "default", amount: 15 }),
  minDice: 1,
  maxDice: 5,
  resourceLimits: [{ resourceId: "default", min: 0, max: 30 }],
  mapSize: 50,
  jackpot: {
    countMode: "fixed",
    count: 7,
    playersPerJackpot: 3,
    rewardPool: all({ resourceId: "default", amount: 30 }),
  },
  cells: [
    { id: "bonus_2", kind: "bonus", rewardPool: all({ resourceId: "default", amount: 2 }), count: 12 },
    { id: "bonus_3", kind: "bonus", rewardPool: all({ resourceId: "default", amount: 3 }), count: 5 },
    { id: "bonus_5", kind: "bonus", rewardPool: all({ resourceId: "default", amount: 5 }), count: 2 },
    { id: "trap_3", kind: "trap", rewardPool: all({ resourceId: "default", amount: -3 }), count: 2 },
    { id: "trap_2", kind: "trap", rewardPool: all({ resourceId: "default", amount: -2 }), count: 4 },
    { id: "trap_1", kind: "trap", rewardPool: all({ resourceId: "default", amount: -1 }), count: 4 },
  ],
  achievements: {
    unlucky: { rewardPool: all({ resourceId: "default", amount: 5 }) },
    careful: { rewardPool: all({ resourceId: "default", amount: 5 }) },
    collector: { rewardPool: all({ resourceId: "default", amount: 5 }) },
    lucky: { rewardPool: all({ resourceId: "default", amount: 5 }) },
  },
};
export const MOVE_TYPES = {
  JACKPOT: "moveWithJackpot",
  EMPTY_JACKPOT: "moveWithEmptyJackpot",
  INCREASE: "moveWithIncreasingPrize",
  DECREASE: "moveWithDecreasingPrize",
  EMPTY: "moveWithoutBonus",
  FINISH: "moveToFinish",
  AT_MAX: "moveWithMaxPrize",
  TO_MAX: "moveToMaxPrize",
  TO_ZERO: "moveToZeroPrize",
  AT_ZERO: "moveWithZeroPrize",
  ACHIEVEMENT: "moveToAchievement",
} as const;
export const JOURNEY_ACHIEVEMENT_NAMES = {
  JACKPOT: "Jackpot",
  UNLUCKY: "Unlucky",
  CAREFUL: "Careful",
  COLLECTOR: "Collector",
  LUCKY: "Lucky",
} as const;
export const JOURNEY_ACHIEVEMENT_STREAK_TARGETS = { unlucky: 3, careful: 4, lucky: 5 } as const;

export function normalizeJourneyRules(rawRules: JourneyRulesInput = {}): JourneyRules {
  const defaults = clone(DEFAULT_JOURNEY_RULES);
  const raw = rawRules as JourneyRulesInput & Record<string, unknown>;
  const {
    initialRewards: legacyInitialRewards,
    maxPrizes: legacyMaxPrizes,
    jackpot: rawJackpotInput,
    cells: rawCellsInput,
    achievements: rawAchievementsInput,
    ...canonicalRuleFields
  } = raw;
  const legacyPool = (values: unknown): AllRewardPool => ({
    mode: "all",
    rewards: Array.isArray(values)
      ? values.flatMap((value) => {
          const record = value as { currencyId?: unknown; value?: unknown };
          return typeof record.currencyId === "string" && typeof record.value === "number"
            ? [{ resourceId: record.currencyId, amount: record.value }]
            : [];
        })
      : [],
  });
  const resolvedPool = (pool: unknown, legacyValues: unknown, fallback: RewardPool): RewardPool => {
    const legacy = legacyPool(legacyValues);
    if (pool && typeof pool === "object" && "mode" in pool) {
      const candidate = pool as RewardPool;
      // Older frontend payloads added an empty all-pool beside the actual legacy rewards.
      if (candidate.mode === "all" && candidate.rewards.length === 0 && legacy.rewards.length) return legacy;
      return clone(candidate);
    }
    return legacy.rewards.length ? legacy : clone(fallback);
  };
  const rawJackpot = (rawJackpotInput ?? {}) as Record<string, unknown>;
  const { rewards: legacyJackpotRewards, ...canonicalJackpotFields } = rawJackpot;
  const rawAchievements = (rawAchievementsInput ?? {}) as Record<string, Record<string, unknown>>;
  const rawCells = Array.isArray(rawCellsInput) ? (rawCellsInput as unknown as Array<Record<string, unknown>>) : [];
  const legacyLimits = Array.isArray(legacyMaxPrizes)
    ? legacyMaxPrizes.flatMap((value) => {
        const record = value as { currencyId?: unknown; value?: unknown };
        return typeof record.currencyId === "string" && typeof record.value === "number"
          ? [{ resourceId: record.currencyId, min: 0, max: record.value }]
          : [];
      })
    : null;
  return {
    ...defaults,
    ...canonicalRuleFields,
    initialRewardPool: resolvedPool(raw.initialRewardPool, legacyInitialRewards, defaults.initialRewardPool),
    minDice: positiveInteger(rawRules.minDice, defaults.minDice),
    maxDice: positiveInteger(rawRules.maxDice, defaults.maxDice),
    mapSize: positiveInteger(rawRules.mapSize, defaults.mapSize),
    resourceLimits: Array.isArray(rawRules.resourceLimits)
      ? clone(rawRules.resourceLimits)
      : (legacyLimits ?? defaults.resourceLimits),
    jackpot: {
      ...defaults.jackpot,
      ...canonicalJackpotFields,
      countMode: rawRules.jackpot?.countMode === "by_players" ? "by_players" : "fixed",
      count: nonNegativeInteger(rawRules.jackpot?.count, defaults.jackpot.count, JOURNEY_MAX_JACKPOT_COUNT),
      playersPerJackpot: positiveInteger(rawRules.jackpot?.playersPerJackpot, defaults.jackpot.playersPerJackpot),
      rewardPool: resolvedPool(rawJackpot.rewardPool, legacyJackpotRewards, defaults.jackpot.rewardPool),
    },
    cells: rawCells.length
      ? rawCells.map((cell) => ({
          id: String(cell.id ?? ""),
          kind: cell.kind === "trap" ? "trap" : "bonus",
          count: nonNegativeInteger(cell.count, 0),
          rewardPool: resolvedPool(cell.rewardPool, cell.rewards, defaults.cells[0].rewardPool),
        }))
      : defaults.cells,
    achievements: {
      unlucky: {
        rewardPool: resolvedPool(
          rawAchievements.unlucky?.rewardPool,
          rawAchievements.unlucky?.rewards,
          defaults.achievements.unlucky.rewardPool,
        ),
      },
      careful: {
        rewardPool: resolvedPool(
          rawAchievements.careful?.rewardPool,
          rawAchievements.careful?.rewards,
          defaults.achievements.careful.rewardPool,
        ),
      },
      collector: {
        rewardPool: resolvedPool(
          rawAchievements.collector?.rewardPool,
          rawAchievements.collector?.rewards,
          defaults.achievements.collector.rewardPool,
        ),
      },
      lucky: {
        rewardPool: resolvedPool(
          rawAchievements.lucky?.rewardPool,
          rawAchievements.lucky?.rewards,
          defaults.achievements.lucky.rewardPool,
        ),
      },
    },
  };
}
export function getJourneyJackpotCount(rules: JourneyRules = DEFAULT_JOURNEY_RULES, playersCount = 0): number {
  const normalized = normalizeJourneyRules(rules);
  return normalized.jackpot.countMode === "fixed"
    ? normalized.jackpot.count
    : Math.min(
        JOURNEY_MAX_JACKPOT_COUNT,
        Math.ceil(Math.max(0, Math.trunc(playersCount)) / normalized.jackpot.playersPerJackpot),
      );
}
export function getJourneyConfig(
  rules: JourneyRules = DEFAULT_JOURNEY_RULES,
  resources: ResourceSnapshot[] = [],
): JourneyConfig {
  const normalized = normalizeJourneyRules(rules);
  return {
    mapSize: normalized.mapSize,
    finishPosition: normalized.mapSize + 1,
    initialRewardPool: clone(normalized.initialRewardPool),
    minDice: normalized.minDice,
    maxDice: normalized.maxDice,
    resourceLimits: clone(normalized.resourceLimits),
    jackpotRewardPool: clone(normalized.jackpot.rewardPool),
    resources: clone(resources),
  };
}
export function getJourneyBonusCells(
  rules: JourneyRules = DEFAULT_JOURNEY_RULES,
  playersCount = 0,
): Array<{ cell: JourneyMapCell; amount: number }> {
  const normalized = normalizeJourneyRules(rules);
  return [
    {
      cell: {
        id: "jackpot",
        kind: "bonus",
        rewardPool: clone(normalized.jackpot.rewardPool),
        isJackpot: true,
        winner: null,
      },
      amount: getJourneyJackpotCount(normalized, playersCount),
    },
    ...normalized.cells.map((cell) => ({
      cell: { id: cell.id, kind: cell.kind, rewardPool: clone(cell.rewardPool) },
      amount: cell.count,
    })),
  ];
}
export function getJourneyAchievements(rules: JourneyRules = DEFAULT_JOURNEY_RULES): JourneyAchievementsMap {
  const normalized = normalizeJourneyRules(rules);
  return {
    JACKPOT: {
      name: JOURNEY_ACHIEVEMENT_NAMES.JACKPOT,
      title: "Сокровище",
      rewardPool: clone(normalized.jackpot.rewardPool),
    },
    UNLUCKY: {
      name: JOURNEY_ACHIEVEMENT_NAMES.UNLUCKY,
      title: "Невезучий",
      rewardPool: clone(normalized.achievements.unlucky.rewardPool),
      description: "Попадание на 3 клетки с ловушками подряд",
    },
    CAREFUL: {
      name: JOURNEY_ACHIEVEMENT_NAMES.CAREFUL,
      title: "Осторожный",
      rewardPool: clone(normalized.achievements.careful.rewardPool),
      description: "Попадание на 4 пустые клетки подряд",
    },
    COLLECTOR: {
      name: JOURNEY_ACHIEVEMENT_NAMES.COLLECTOR,
      title: "Коллекционер",
      rewardPool: clone(normalized.achievements.collector.rewardPool),
      description: "Попадание на все виды бонусных, ловушек и пустую клетку",
    },
    LUCKY: {
      name: JOURNEY_ACHIEVEMENT_NAMES.LUCKY,
      title: "Счастливчик",
      rewardPool: clone(normalized.achievements.lucky.rewardPool),
      description: "Попадание на 5 клеток с наградой подряд, без учёта сокровища",
    },
  };
}
export function validateJourneyRules(rules: JourneyRules, resources: readonly Resource[]): void {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const validatePool = (pool: RewardPool, location: string, expectedSign?: "positive" | "negative") => {
    const amounts =
      pool.mode === "all"
        ? pool.rewards
        : pool.mode === "weighted_one"
          ? pool.options.flatMap((option) => (option.reward ? [option.reward] : []))
          : pool.options.map((option) => option.reward);
    if (pool.mode === "weighted_one") {
      if (
        !pool.options.length ||
        pool.options.some((option) => !Number.isSafeInteger(option.weight) || option.weight <= 0)
      )
        throw new Error(`${location}: weighted options require positive integer weights`);
    }
    if (
      pool.mode === "independent" &&
      pool.options.some(
        (option) => !Number.isInteger(option.chanceBps) || option.chanceBps < 0 || option.chanceBps > 10_000,
      )
    )
      throw new Error(`${location}: chanceBps must be an integer from 0 to 10000`);
    amounts.forEach((amount) => {
      assertValidResourceAmount(amount, resourcesById);
      const resource = resourcesById.get(amount.resourceId)!;
      if (expectedSign === "positive" && amount.amount < 0)
        throw new Error(`${location}: bonus rewards must be positive`);
      if (expectedSign === "negative" && (resource.type !== "currency" || amount.amount > 0))
        throw new Error(`${location}: trap rewards must be negative currencies`);
    });
  };
  if (rules.initialRewardPool.mode !== "all") throw new Error("Initial Journey rewards must use mode 'all'");
  validatePool(rules.initialRewardPool, "Initial rewards", "positive");
  validatePool(rules.jackpot.rewardPool, "Jackpot", "positive");
  rules.cells.forEach((cell) =>
    validatePool(cell.rewardPool, `Cell '${cell.id}'`, cell.kind === "bonus" ? "positive" : "negative"),
  );
  Object.entries(rules.achievements).forEach(([name, achievement]) =>
    validatePool(achievement.rewardPool, `Achievement '${name}'`, "positive"),
  );
  assertValidResourceLimits(rules.resourceLimits, resourcesById);
}
export const JOURNEY_CONFIG = getJourneyConfig();
export const JOURNEY_BONUS_CELLS = getJourneyBonusCells();
export const JOURNEY_ACHIEVEMENTS = getJourneyAchievements();
