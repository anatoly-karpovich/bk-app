import type { Document, WithId } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY = "--apply";
const ROLLBACK_GAMES = "--rollback-games";
const DELETE_LEGACY_GAMES = "--delete-legacy-games";
const clone = <T>(value: T): T => structuredClone(value);
const toAmount = (value: unknown) => {
  const record = value as { currencyId?: unknown; value?: unknown };
  return typeof record.currencyId === "string" && typeof record.value === "number"
    ? { resourceId: record.currencyId, amount: record.value }
    : null;
};
const toPool = (values: unknown) => ({
  mode: "all" as const,
  rewards: Array.isArray(values)
    ? values.map(toAmount).filter((value): value is { resourceId: string; amount: number } => Boolean(value))
    : [],
});
function migrateRules(source: Record<string, unknown>): Record<string, unknown> {
  if ("initialRewardPool" in source) return clone(source);
  const {
    initialRewards: _initialRewards,
    maxPrizes: _maxPrizes,
    cells: sourceCells,
    achievements: sourceAchievements,
    jackpot: sourceJackpot,
    ...rest
  } = source;
  const jackpot = (sourceJackpot ?? {}) as Record<string, unknown>;
  const { rewards: _jackpotRewards, ...jackpotRest } = jackpot;
  const achievements = (sourceAchievements ?? {}) as Record<string, Record<string, unknown>>;
  const cells = Array.isArray(sourceCells)
    ? sourceCells.map((cell) => {
        const record = cell as Record<string, unknown>;
        const { rewards, ...cellRest } = record;
        return { ...cellRest, rewardPool: toPool(rewards) };
      })
    : [];
  const maxPrizes = Array.isArray(_maxPrizes)
    ? (_maxPrizes.map(toAmount).filter(Boolean) as Array<{ resourceId: string; amount: number }>)
    : [];
  const migrateAchievement = (name: string) => {
    const { rewards, ...achievementRest } = achievements[name] ?? {};
    return { ...achievementRest, rewardPool: toPool(rewards) };
  };
  return {
    ...rest,
    initialRewardPool: toPool(_initialRewards),
    resourceLimits: maxPrizes.map((value) => ({ resourceId: value.resourceId, min: 0, max: value.amount })),
    jackpot: { ...jackpotRest, rewardPool: toPool(_jackpotRewards) },
    cells,
    achievements: {
      unlucky: migrateAchievement("unlucky"),
      careful: migrateAchievement("careful"),
      collector: migrateAchievement("collector"),
      lucky: migrateAchievement("lucky"),
    },
  };
}
function migrateResources(project: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(project.resources)) return clone(project);
  const currencies = Array.isArray(project.currencies) ? project.currencies : [];
  const resources = currencies.map((value) => {
    const currency = value as Record<string, unknown>;
    const precision = Number(currency.precision ?? 0);
    if (precision > 1)
      throw new Error(`Project ${String(project._id)} has currency precision ${precision}; only 0 or 1 is supported`);
    return {
      ...currency,
      type: "currency",
      valueType: currency.valueType === "decimal" ? "decimal" : "integer",
      precision: currency.valueType === "decimal" ? 1 : 0,
    };
  });
  const { currencies: _ignored, ...rest } = project;
  return { ...rest, resources };
}
function migrateJourneyGame(source: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(source.resources) && (source.rules as Record<string, unknown> | undefined)?.initialRewardPool)
    return clone(source);
  const resources = Array.isArray(source.resources)
    ? source.resources
    : Array.isArray(source.currencies)
      ? source.currencies.map((currency) => ({ ...(currency as Record<string, unknown>), type: "currency" }))
      : [];
  const { currencies: _ignored, ...rest } = source;
  const game = { ...rest, resources, rules: migrateRules((source.rules ?? {}) as Record<string, unknown>) } as Record<
    string,
    any
  >;
  const map = game.stateV2?.map;
  if (map && typeof map === "object")
    Object.values(map).forEach((cell: any) => {
      if (Array.isArray(cell.rewards)) {
        cell.rewardPool = toPool(cell.rewards);
        delete cell.rewards;
      }
    });
  game.stateV2?.rounds?.forEach((round: any) =>
    round.turns?.forEach((turn: any) => {
      if (turn.kind !== "move") return;
      const applied = Array.isArray(turn.appliedRewards) ? turn.appliedRewards.map(toAmount).filter(Boolean) : [];
      turn.requestedRewards = turn.requestedRewards ?? clone(applied);
      turn.resolvedRewards = turn.resolvedRewards ?? clone(applied);
      turn.appliedRewards = applied;
      turn.achievementEffects?.forEach((effect: any) => {
        const effectApplied = Array.isArray(effect.appliedRewards)
          ? effect.appliedRewards.map(toAmount).filter(Boolean)
          : [];
        effect.requestedRewards = effect.requestedRewards ?? clone(effectApplied);
        effect.resolvedRewards = effect.resolvedRewards ?? clone(effectApplied);
        effect.appliedRewards = effectApplied;
      });
    }),
  );
  return game;
}
function fromAmount(value: unknown) {
  const record = value as { resourceId?: unknown; amount?: unknown };
  return typeof record.resourceId === "string" && typeof record.amount === "number"
    ? { currencyId: record.resourceId, value: record.amount }
    : null;
}
function fromAllPool(value: unknown): Array<{ currencyId: string; value: number }> {
  const pool = value as { mode?: unknown; rewards?: unknown };
  if (pool?.mode !== "all" || !Array.isArray(pool.rewards))
    throw new Error("Cannot roll back a Journey game with random reward pools");
  return pool.rewards
    .map(fromAmount)
    .filter((amount): amount is { currencyId: string; value: number } => Boolean(amount));
}
function rollbackJourneyGame(source: Record<string, any>): Record<string, unknown> {
  if (!Array.isArray(source.resources) || !(source.rules as Record<string, unknown> | undefined)?.initialRewardPool)
    return clone(source);
  const rules = source.rules as Record<string, any>;
  const { initialRewardPool, resourceLimits, cells, achievements, jackpot, ...ruleRest } = rules;
  if (Array.isArray(resourceLimits) && resourceLimits.some((limit) => limit.min !== 0 || limit.max === undefined))
    throw new Error("Cannot roll back Journey game with non-legacy resource limits");
  const toLegacyCell = (cell: Record<string, any>) => {
    const { rewardPool, ...rest } = cell;
    return { ...rest, rewards: fromAllPool(rewardPool) };
  };
  const toLegacyAchievement = (achievement: Record<string, any>) => {
    const { rewardPool, ...rest } = achievement;
    return { ...rest, rewards: fromAllPool(rewardPool) };
  };
  const { rewardPool: jackpotPool, ...jackpotRest } = jackpot as Record<string, any>;
  const legacyRules = {
    ...ruleRest,
    initialRewards: fromAllPool(initialRewardPool),
    maxPrizes: (resourceLimits ?? []).map((limit: any) => ({ currencyId: limit.resourceId, value: limit.max })),
    jackpot: { ...jackpotRest, rewards: fromAllPool(jackpotPool) },
    cells: (cells ?? []).map(toLegacyCell),
    achievements: Object.fromEntries(
      Object.entries(achievements ?? {}).map(([name, achievement]) => [
        name,
        toLegacyAchievement(achievement as Record<string, any>),
      ]),
    ),
  };
  const currencies = source.resources
    .filter((resource: any) => resource.type === "currency")
    .map(({ type: _type, unitLabel: _unitLabel, ...currency }: any) => currency);
  const { resources: _resources, ...rest } = source;
  const game: Record<string, any> = { ...rest, currencies, rules: legacyRules };
  Object.values(game.stateV2?.map ?? {}).forEach((cell: any) => {
    if (cell.rewardPool) {
      cell.rewards = fromAllPool(cell.rewardPool);
      delete cell.rewardPool;
    }
  });
  game.stateV2?.rounds?.forEach((round: any) =>
    round.turns?.forEach((turn: any) => {
      if (turn.kind !== "move") return;
      turn.appliedRewards = (turn.appliedRewards ?? []).map(fromAmount).filter(Boolean);
      delete turn.requestedRewards;
      delete turn.resolvedRewards;
      turn.achievementEffects?.forEach((effect: any) => {
        effect.appliedRewards = (effect.appliedRewards ?? []).map(fromAmount).filter(Boolean);
        delete effect.requestedRewards;
        delete effect.resolvedRewards;
      });
    }),
  );
  return game;
}
async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const db = client.db(connection.getDatabaseName());
  try {
    const projects = await db.collection<Document>("projects").find({}).toArray();
    const configs = await db.collection<Document>("game_configs").find({ gameType: "journey" }).toArray();
    if (process.argv.includes(ROLLBACK_GAMES)) {
      const games = await db
        .collection<Document>("journey_games")
        .find({ "rules.initialRewardPool": { $exists: true } })
        .toArray();
      if (!process.argv.includes(APPLY)) {
        console.log(
          JSON.stringify(
            {
              database: connection.getDatabaseName(),
              journeyGames: games.length,
              applied: false,
              nextStep: `Run again with ${APPLY} ${ROLLBACK_GAMES} to restore only games migrated by mistake.`,
            },
            null,
            2,
          ),
        );
        return;
      }
      const writes = games.map((game) => ({
        replaceOne: { filter: { _id: game._id }, replacement: rollbackJourneyGame(game) },
      }));
      if (writes.length) await db.collection<Document>("journey_games").bulkWrite(writes);
      console.log(
        JSON.stringify(
          { database: connection.getDatabaseName(), journeyGames: writes.length, rolledBack: true },
          null,
          2,
        ),
      );
      return;
    }
    if (process.argv.includes(DELETE_LEGACY_GAMES)) {
      const filter = { resources: { $exists: false } };
      const count = await db.collection<Document>("journey_games").countDocuments(filter);
      if (!process.argv.includes(APPLY)) {
        console.log(
          JSON.stringify(
            {
              database: connection.getDatabaseName(),
              legacyJourneyGames: count,
              applied: false,
              nextStep: `Run again with ${APPLY} ${DELETE_LEGACY_GAMES} to permanently delete only old Journey games.`,
            },
            null,
            2,
          ),
        );
        return;
      }
      const result = await db.collection<Document>("journey_games").deleteMany(filter);
      console.log(
        JSON.stringify(
          { database: connection.getDatabaseName(), deletedLegacyJourneyGames: result.deletedCount, applied: true },
          null,
          2,
        ),
      );
      return;
    }
    if (!process.argv.includes(APPLY)) {
      console.log(
        JSON.stringify(
          {
            database: connection.getDatabaseName(),
            projects: projects.filter((project) => !Array.isArray(project.resources)).length,
            journeyConfigs: configs.filter(
              (config) => !(config.rules as Record<string, unknown> | undefined)?.initialRewardPool,
            ).length,
            journeyGames: 0,
            applied: false,
            nextStep: `Run again with ${APPLY} after reviewing this output.`,
          },
          null,
          2,
        ),
      );
      return;
    }
    const projectWrites = projects.map((project) => ({
      replaceOne: { filter: { _id: project._id }, replacement: migrateResources(project) },
    }));
    const configWrites = configs.map((config) => ({
      updateOne: {
        filter: { _id: config._id },
        update: { $set: { rules: migrateRules((config.rules ?? {}) as Record<string, unknown>) } },
      },
    }));
    if (projectWrites.length) await db.collection<Document>("projects").bulkWrite(projectWrites);
    if (configWrites.length) await db.collection<Document>("game_configs").bulkWrite(configWrites);
    console.log(
      JSON.stringify(
        {
          database: connection.getDatabaseName(),
          projects: projectWrites.length,
          journeyConfigs: configWrites.length,
          journeyGames: 0,
          applied: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}
run().catch((error) => {
  console.error("Resource and Journey reward migration failed", error);
  process.exit(1);
});
