import type { Document } from "mongodb";
import { normalizeBattleshipsRules, validateBattleshipsRules } from "../modules/battleships/domain/config";
import type { BattleshipsRulesInput } from "../modules/battleships/domain/types";
import { normalizeJourneyRules, validateJourneyRules } from "../modules/journey/domain/config";
import type { JourneyRulesInput } from "../modules/journey/domain/types";
import { normalizeLottoRules, validateLottoRules } from "../modules/lotto/domain/config";
import type { LottoRulesInput } from "../modules/lotto/domain/types";
import type { Resource } from "../modules/rewards";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY = "--apply";
const GAME_TYPES = ["journey", "battleships", "lotto"] as const;
type GameType = (typeof GAME_TYPES)[number];

function normalizeRules(gameType: GameType, rules: unknown, resources: readonly Resource[]) {
  switch (gameType) {
    case "journey": {
      const normalized = normalizeJourneyRules(rules as JourneyRulesInput);
      validateJourneyRules(normalized, resources);
      return normalized;
    }
    case "battleships": {
      const normalized = normalizeBattleshipsRules(rules as BattleshipsRulesInput);
      validateBattleshipsRules(normalized, resources);
      return normalized;
    }
    case "lotto": {
      const normalized = normalizeLottoRules(rules as LottoRulesInput);
      validateLottoRules(normalized, resources);
      return normalized;
    }
  }
}

function sameRules(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function run(): Promise<void> {
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const db = client.db(connection.getDatabaseName());

  try {
    const [projects, configs] = await Promise.all([
      db.collection<Document>("projects").find({}, { projection: { resources: 1 } }).toArray(),
      db.collection<Document>("game_configs").find({ gameType: { $in: GAME_TYPES } }).toArray(),
    ]);
    const resourcesByProjectId = new Map(
      projects.map((project) => [project._id.toHexString(), project.resources] as const),
    );
    const migratedByGameType: Record<GameType, number> = { journey: 0, battleships: 0, lotto: 0 };
    const writes = configs.map((config) => {
      const gameType = config.gameType as GameType;
      const resources = resourcesByProjectId.get(config.projectId);
      if (!Array.isArray(resources)) {
        throw new Error(`Config ${config._id.toHexString()} requires a project resource catalog; migrate projects first`);
      }

      const rules = normalizeRules(gameType, config.rules, resources as Resource[]);
      if (sameRules(config.rules, rules)) {
        return null;
      }

      migratedByGameType[gameType] += 1;
      return {
        updateOne: {
          filter: { _id: config._id },
          update: { $set: { rules, updatedAt: new Date().toISOString() } },
        },
      };
    }).filter((write): write is NonNullable<typeof write> => write !== null);

    const summary = {
      database: connection.getDatabaseName(),
      configs: configs.length,
      configsToMigrate: writes.length,
      migratedByGameType,
      applied: process.argv.includes(APPLY),
    };

    if (!process.argv.includes(APPLY)) {
      console.log(JSON.stringify({ ...summary, nextStep: `Run again with ${APPLY} after reviewing this output.` }, null, 2));
      return;
    }

    if (writes.length) {
      await db.collection<Document>("game_configs").bulkWrite(writes, { ordered: true });
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Game-config reward-pool migration failed", error);
  process.exit(1);
});
