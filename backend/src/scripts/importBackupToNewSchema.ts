import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON, Int32, ObjectId } from "mongodb";
import { normalizeStoredAppConfig } from "../modules/configs/domain/normalizeConfig";
import { normalizeProjectCurrencies } from "../modules/projects/domain/normalizeProjectCurrencies";
import { BattleshipsEngine } from "../modules/battleships/BattleshipsEngine";
import { CryptoRandomizer, RewardGrantService } from "../modules/rewards";
import { normalizeJourneyGame } from "../modules/journey/domain/engine";
import { LottoEngine } from "../modules/lotto/LottoEngine";
import { LottoPayoutDistributor } from "../modules/lotto/domain/LottoPayoutDistributor";
import type { GameType } from "../modules/gameConfigs/domain/types";

type LegacyDocument = Record<string, unknown> & { _id: ObjectId };
type LegacyConfigInput = Parameters<typeof normalizeStoredAppConfig>[0];

interface BackupManifestCollection {
  name: string;
  documents: number;
  indexes: number;
  dataFile: string;
  indexesFile?: string;
}

interface BackupManifest {
  exportedAt: string;
  dbName: string;
  collections: BackupManifestCollection[];
}

interface LegacyConfigMapping {
  projectId: string;
  configName: string;
  gameConfigIds: Record<GameType, string>;
  currencies: ReturnType<typeof normalizeProjectCurrencies>;
}

interface UnresolvedGame {
  id: string;
  reason: string;
}

function getArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required argument ${name}`);
  }
  return path.resolve(value);
}

function createDeterministicObjectId(seed: string): ObjectId {
  return new ObjectId(createHash("sha256").update(seed).digest("hex").slice(0, 24));
}

function createDefaultIndexes(): Record<string, unknown>[] {
  return [{ v: new Int32(2), key: { _id: new Int32(1) }, name: "_id_" }];
}

async function readEjsonArray(directory: string, fileName: string): Promise<LegacyDocument[]> {
  const content = await readFile(path.join(directory, fileName), "utf8");
  return BSON.EJSON.parse(content, { relaxed: false }) as LegacyDocument[];
}

async function writeEjsonArray(directory: string, fileName: string, documents: unknown[]): Promise<void> {
  await writeFile(path.join(directory, fileName), BSON.EJSON.stringify(documents, { relaxed: false }), "utf8");
}

function resolveLegacyConfig(
  game: LegacyDocument,
  mappings: Map<string, LegacyConfigMapping>,
  mappingsByName: Map<string, LegacyConfigMapping[]>,
): LegacyConfigMapping | null {
  const configId = typeof game.configId === "string" ? game.configId : "";
  const direct = mappings.get(configId);
  if (direct) {
    return direct;
  }

  const configName = typeof game.configName === "string" ? game.configName.trim() : "";
  const named = mappingsByName.get(configName) ?? [];
  return named.length === 1 ? named[0] : null;
}

function normalizeGameCollection(
  collectionName: string,
  games: LegacyDocument[],
  mappings: Map<string, LegacyConfigMapping>,
  mappingsByName: Map<string, LegacyConfigMapping[]>,
): { documents: LegacyDocument[]; unresolved: UnresolvedGame[] } {
  const unresolved: UnresolvedGame[] = [];
  const battleshipsEngine = new BattleshipsEngine(new RewardGrantService(new CryptoRandomizer()));
  const lottoEngine = new LottoEngine(new RewardGrantService(new CryptoRandomizer()), new LottoPayoutDistributor());
  const gameType: GameType = collectionName.startsWith("journey")
    ? "journey"
    : collectionName.startsWith("battleships")
      ? "battleships"
      : "lotto";

  const documents = games.flatMap((game) => {
    const mapping = resolveLegacyConfig(game, mappings, mappingsByName);
    if (!mapping) {
      unresolved.push({ id: game._id.toHexString(), reason: "No unambiguous legacy config match" });
      return [];
    }

    const mapped = {
      ...game,
      projectId: mapping.projectId,
      configId: mapping.gameConfigIds[gameType],
      configName: "Default",
      currencies: mapping.currencies,
    };
    try {
      const normalized = gameType === "journey"
        ? normalizeJourneyGame(mapped as never)
        : gameType === "battleships"
          ? battleshipsEngine.normalizeGame(mapped as never)
          : lottoEngine.normalizeGame(mapped as never);

      return normalized ? [{ ...normalized, _id: game._id } as LegacyDocument] : [];
    } catch (error) {
      unresolved.push({
        id: game._id.toHexString(),
        reason: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  });

  return { documents, unresolved };
}

async function run(): Promise<void> {
  const sourceDirectory = getArgument("--source");
  const outputDirectory = getArgument("--output");
  if (sourceDirectory === outputDirectory) {
    throw new Error("--output must be different from --source");
  }

  const sourceManifest = BSON.EJSON.parse(await readFile(path.join(sourceDirectory, "manifest.json"), "utf8")) as BackupManifest;
  const legacyConfigs = await readEjsonArray(sourceDirectory, "configs.data.ejson");
  const mappings = new Map<string, LegacyConfigMapping>();
  const mappingsByName = new Map<string, LegacyConfigMapping[]>();

  const projects = legacyConfigs.map((legacyConfig) => {
    const legacyConfigId = legacyConfig._id.toHexString();
    const fallbackTimestamp = legacyConfig._id.getTimestamp().toISOString();
    const config = normalizeStoredAppConfig(legacyConfig as unknown as LegacyConfigInput, fallbackTimestamp);
    const projectId = legacyConfigId;
    const currencies = normalizeProjectCurrencies(config.currencies, config.createdAt);
    const mapping: LegacyConfigMapping = {
      projectId,
      configName: config.name,
      currencies,
      gameConfigIds: {
        journey: createDeterministicObjectId(`${legacyConfigId}:journey`).toHexString(),
        battleships: createDeterministicObjectId(`${legacyConfigId}:battleships`).toHexString(),
        lotto: createDeterministicObjectId(`${legacyConfigId}:lotto`).toHexString(),
      },
    };
    mappings.set(legacyConfigId, mapping);
    mappingsByName.set(config.name, [...(mappingsByName.get(config.name) ?? []), mapping]);

    return {
      _id: legacyConfig._id,
      code: `project-${legacyConfigId.slice(0, 8)}`,
      name: config.name,
      description: config.description,
      currencies,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  });

  const gameConfigs = legacyConfigs.flatMap((legacyConfig) => {
    const legacyConfigId = legacyConfig._id.toHexString();
    const fallbackTimestamp = legacyConfig._id.getTimestamp().toISOString();
    const config = normalizeStoredAppConfig(legacyConfig as unknown as LegacyConfigInput, fallbackTimestamp);
    const mapping = mappings.get(legacyConfigId)!;
    return (["journey", "battleships", "lotto"] as const).map((gameType) => ({
      _id: new ObjectId(mapping.gameConfigIds[gameType]),
      projectId: mapping.projectId,
      gameType,
      name: "Default",
      description: config.description,
      rules: config.games[gameType],
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  });

  await mkdir(outputDirectory, { recursive: true });
  await writeEjsonArray(outputDirectory, "projects.data.ejson", projects);
  await writeEjsonArray(outputDirectory, "game_configs.data.ejson", gameConfigs);
  await writeEjsonArray(outputDirectory, "projects.indexes.ejson", createDefaultIndexes());
  await writeEjsonArray(outputDirectory, "game_configs.indexes.ejson", createDefaultIndexes());

  const gameCollections = ["journey_games", "battleships_games", "lotto_games"];
  const unresolved: Record<string, UnresolvedGame[]> = {};
  const collections: BackupManifestCollection[] = [
    { name: "projects", documents: projects.length, indexes: 1, dataFile: "projects.data.ejson", indexesFile: "projects.indexes.ejson" },
    { name: "game_configs", documents: gameConfigs.length, indexes: 1, dataFile: "game_configs.data.ejson", indexesFile: "game_configs.indexes.ejson" },
  ];

  for (const collectionName of gameCollections) {
    const games = await readEjsonArray(sourceDirectory, `${collectionName}.data.ejson`);
    const result = normalizeGameCollection(collectionName, games, mappings, mappingsByName);
    unresolved[collectionName] = result.unresolved;
    const dataFile = `${collectionName}.data.ejson`;
    const indexesFile = `${collectionName}.indexes.ejson`;
    await writeEjsonArray(outputDirectory, dataFile, result.documents);
    await writeEjsonArray(outputDirectory, indexesFile, createDefaultIndexes());
    collections.push({ name: collectionName, documents: result.documents.length, indexes: 1, dataFile, indexesFile });
  }

  const report = {
    sourceBackup: path.basename(sourceDirectory),
    sourceExportedAt: sourceManifest.exportedAt,
    importFormat: "project-game-config-backup-v2",
    unresolved,
  };
  await writeFile(path.join(outputDirectory, "import-report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    JSON.stringify({ exportedAt: sourceManifest.exportedAt, dbName: sourceManifest.dbName, collections }, null, 2),
    "utf8",
  );

  console.log(JSON.stringify({ outputDirectory, collections, unresolved }, null, 2));
}

run().catch((error) => {
  console.error("Backup import failed", error);
  process.exit(1);
});
