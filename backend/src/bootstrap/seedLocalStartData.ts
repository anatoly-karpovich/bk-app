import { readFile } from "node:fs/promises";
import path from "node:path";
import { BSON, type Db, type Document } from "mongodb";

const START_DATA_DIRECTORY = path.resolve(__dirname, "..", "..", "backups", "db-data-projects");
const START_DATA_FORMAT = "project-game-config-backup-v2";
const COLLECTION_NAMES = [
  "projects",
  "game_configs",
  "journey_games",
  "battleships_games",
  "lotto_games",
  "configs",
] as const;
const MANUAL_RESTORE_COMMAND =
  "npm run backup:restore-new-schema:local -- --source backups\\db-data-projects --confirm-replace";

interface BackupManifestCollection {
  name: string;
  documents: number;
  dataFile: string;
}

interface BackupManifest {
  collections: BackupManifestCollection[];
}

interface ImportReport {
  importFormat: string;
}

export class LocalStartDataSeedError extends Error {
  constructor(reason: string) {
    super(
      `Local start-data seed failed: ${reason}\n` +
        `To restore the local database manually, run:\n  ${MANUAL_RESTORE_COMMAND}`,
    );
    this.name = "LocalStartDataSeedError";
  }
}

function isLocalSeedEnabled(): boolean {
  const environmentFile = process.env.BK_APP_ENV_FILE?.trim();
  const localEnvironmentFiles = new Set([".env.local", ".env.docker"]);
  return localEnvironmentFiles.has(path.basename(environmentFile ?? "")) && process.env.BK_APP_SEED_EMPTY_DB === "true";
}

async function readEjsonArray(filePath: string): Promise<Document[]> {
  const parsed = BSON.EJSON.parse(await readFile(filePath, "utf8"), { relaxed: false });
  if (!Array.isArray(parsed)) {
    throw new LocalStartDataSeedError(`Expected an EJSON array in ${path.basename(filePath)}.`);
  }
  return parsed as Document[];
}

async function readStartData(): Promise<{ projects: Document[]; gameConfigs: Document[] }> {
  let manifest: BackupManifest;
  let importReport: ImportReport;
  try {
    manifest = JSON.parse(await readFile(path.join(START_DATA_DIRECTORY, "manifest.json"), "utf8")) as BackupManifest;
    importReport = JSON.parse(
      await readFile(path.join(START_DATA_DIRECTORY, "import-report.json"), "utf8"),
    ) as ImportReport;
  } catch (error) {
    throw new LocalStartDataSeedError(
      `Could not read the start-data backup at ${START_DATA_DIRECTORY}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (importReport.importFormat !== START_DATA_FORMAT) {
    throw new LocalStartDataSeedError(
      `Unsupported start-data backup format: ${importReport.importFormat ?? "missing importFormat"}.`,
    );
  }

  if (!Array.isArray(manifest.collections)) {
    throw new LocalStartDataSeedError("The start-data backup manifest does not contain a collections array.");
  }

  const entries = new Map(manifest.collections.map((entry) => [entry.name, entry]));
  const projectsEntry = entries.get("projects");
  const gameConfigsEntry = entries.get("game_configs");
  if (!projectsEntry || !gameConfigsEntry) {
    throw new LocalStartDataSeedError("The start-data backup must contain projects and game_configs.");
  }

  let projects: Document[];
  let gameConfigs: Document[];
  try {
    [projects, gameConfigs] = await Promise.all([
      readEjsonArray(path.join(START_DATA_DIRECTORY, projectsEntry.dataFile)),
      readEjsonArray(path.join(START_DATA_DIRECTORY, gameConfigsEntry.dataFile)),
    ]);
  } catch (error) {
    if (error instanceof LocalStartDataSeedError) {
      throw error;
    }
    throw new LocalStartDataSeedError(
      `Could not read project data from the start-data backup: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (projects.length !== projectsEntry.documents || gameConfigs.length !== gameConfigsEntry.documents) {
    throw new LocalStartDataSeedError("The start-data backup document counts do not match its manifest.");
  }

  return { projects, gameConfigs };
}

async function getCollectionCounts(db: Db): Promise<Record<(typeof COLLECTION_NAMES)[number], number>> {
  const counts = await Promise.all(
    COLLECTION_NAMES.map(async (name) => [name, await db.collection(name).countDocuments()] as const),
  );
  return Object.fromEntries(counts) as Record<(typeof COLLECTION_NAMES)[number], number>;
}

export async function seedLocalStartDataIfNeeded(db: Db): Promise<void> {
  if (!isLocalSeedEnabled()) {
    return;
  }

  const counts = await getCollectionCounts(db);
  const hasProjects = counts.projects > 0;
  const hasGameConfigs = counts.game_configs > 0;
  if (hasProjects && hasGameConfigs) {
    console.log("Local start-data seed skipped: projects and game_configs already exist.");
    return;
  }

  const isCompletelyEmpty = Object.values(counts).every((count) => count === 0);
  if (!isCompletelyEmpty) {
    throw new LocalStartDataSeedError(
      `Database ${db.databaseName} is partially initialized: ${JSON.stringify(counts)}. Automatic seeding only runs on a completely empty database.`,
    );
  }

  const { projects, gameConfigs } = await readStartData();
  if (!projects.length || !gameConfigs.length) {
    throw new LocalStartDataSeedError("The start-data backup must contain at least one project and game config.");
  }

  try {
    await db.collection("projects").insertMany(projects);
    await db.collection("game_configs").insertMany(gameConfigs);
  } catch (error) {
    throw new LocalStartDataSeedError(
      `Could not insert start data into ${db.databaseName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log(`Local start data seeded: ${projects.length} projects and ${gameConfigs.length} game configs.`);
}
