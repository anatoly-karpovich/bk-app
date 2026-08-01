import { readFile } from "node:fs/promises";
import path from "node:path";
import { BSON, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const APPLY = "--apply";
const DEFAULT_SOURCE = path.resolve(process.cwd(), "backups", "db-data-projects", "game_configs.data.ejson");
const amount = (value: unknown) => { const record = value as { currencyId?: unknown; value?: unknown }; return typeof record.currencyId === "string" && typeof record.value === "number" ? { resourceId: record.currencyId, amount: record.value } : null; };
const allPool = (values: unknown) => ({ mode: "all" as const, rewards: Array.isArray(values) ? values.map(amount).filter((value): value is { resourceId: string; amount: number } => Boolean(value)) : [] });
function migrateJourneyRules(source: Record<string, unknown>): Record<string, unknown> {
  if ("initialRewardPool" in source) return structuredClone(source);
  const { initialRewards, maxPrizes, cells: sourceCells, achievements: sourceAchievements, jackpot: sourceJackpot, ...rest } = source;
  const jackpot = (sourceJackpot ?? {}) as Record<string, unknown>; const { rewards: jackpotRewards, ...jackpotRest } = jackpot;
  const cells = Array.isArray(sourceCells) ? sourceCells.map((value) => { const cell = value as Record<string, unknown>; const { rewards, ...cellRest } = cell; return { ...cellRest, rewardPool: allPool(rewards) }; }) : [];
  const achievements = sourceAchievements as Record<string, Record<string, unknown>> | undefined;
  const achievement = (name: string) => { const { rewards, ...achievementRest } = achievements?.[name] ?? {}; return { ...achievementRest, rewardPool: allPool(rewards) }; };
  const limits = Array.isArray(maxPrizes) ? maxPrizes.map(amount).filter((value): value is { resourceId: string; amount: number } => Boolean(value)).map((value) => ({ resourceId: value.resourceId, min: 0, max: value.amount })) : [];
  return { ...rest, initialRewardPool: allPool(initialRewards), resourceLimits: limits, jackpot: { ...jackpotRest, rewardPool: allPool(jackpotRewards) }, cells, achievements: { unlucky: achievement("unlucky"), careful: achievement("careful"), collector: achievement("collector"), lucky: achievement("lucky") } };
}
async function run(): Promise<void> {
  loadEnvironment();
  const sourceIndex = process.argv.indexOf("--source");
  const source = sourceIndex >= 0 ? path.resolve(process.argv[sourceIndex + 1] ?? "") : DEFAULT_SOURCE;
  const configs = BSON.EJSON.parse(await readFile(source, "utf8"), { relaxed: false }) as Array<Record<string, unknown>>;
  const migrated = configs.map((config) => config.gameType === "journey" ? { ...config, rules: migrateJourneyRules(config.rules as Record<string, unknown>) } : config);
  const connection = getDefaultMongoConnection(); const client = await connection.getClient(); const db = client.db(connection.getDatabaseName());
  try {
    const projectIds = new Set((await db.collection<Document>("projects").find({}, { projection: { _id: 1 } }).toArray()).map((project) => project._id.toHexString()));
    const missingProjects = [...new Set(migrated.map((config) => config.projectId).filter((projectId): projectId is string => typeof projectId === "string" && !projectIds.has(projectId)))];
    if (missingProjects.length) throw new Error(`Backup configs refer to missing local projects: ${missingProjects.join(", ")}`);
    const summary = { database: connection.getDatabaseName(), source, configs: migrated.length, byGameType: Object.fromEntries(["journey", "battleships", "lotto"].map((type) => [type, migrated.filter((config) => config.gameType === type).length])) };
    if (!process.argv.includes(APPLY)) { console.log(JSON.stringify({ ...summary, applied: false, nextStep: `Run again with ${APPLY} to replace local game_configs only.` }, null, 2)); return; }
    const collection = db.collection<Document>("game_configs"); await collection.deleteMany({}); if (migrated.length) await collection.insertMany(migrated);
    console.log(JSON.stringify({ ...summary, applied: true }, null, 2));
  } finally { await client.close(); }
}
run().catch((error) => { console.error("Backup config replacement failed", error); process.exit(1); });
