import { readFile } from "node:fs/promises";
import path from "node:path";
import { BSON, type Db, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const IMPORT_FORMAT = "project-game-config-backup-v2";
const RESTORE_COLLECTIONS = [
  "projects",
  "game_configs",
  "journey_games",
  "battleships_games",
  "lotto_games",
] as const;
const LEGACY_CONFIGS_COLLECTION = "configs";

type RestoreCollectionName = (typeof RESTORE_COLLECTIONS)[number];

interface BackupManifestCollection {
  name: string;
  documents: number;
  dataFile: string;
}

interface BackupManifest {
  dbName: string;
  collections: BackupManifestCollection[];
}

interface ImportReport {
  importFormat: string;
  unresolved: Record<string, Array<{ id: string; reason: string }>>;
}

interface BackupData {
  sourceDirectory: string;
  manifest: BackupManifest;
  importReport: ImportReport;
  documentsByCollection: Map<RestoreCollectionName, Document[]>;
}

interface RestoreArguments {
  sourceDirectory: string;
  dryRun: boolean;
  confirmReplace: boolean;
}

interface SwapRecord {
  collectionName: RestoreCollectionName | typeof LEGACY_CONFIGS_COLLECTION;
  rollbackName?: string;
}

function getRequiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required argument ${name}`);
  }
  return path.resolve(value);
}

function readArguments(): RestoreArguments {
  const dryRun = process.argv.includes("--dry-run");
  const confirmReplace = process.argv.includes("--confirm-replace");
  if (dryRun && confirmReplace) {
    throw new Error("Use either --dry-run or --confirm-replace, not both");
  }
  if (!dryRun && !confirmReplace) {
    throw new Error("Refusing to modify MongoDB without --confirm-replace. Use --dry-run first.");
  }

  return {
    sourceDirectory: getRequiredArgument("--source"),
    dryRun,
    confirmReplace,
  };
}

async function readEjsonArray(filePath: string): Promise<Document[]> {
  const parsed = BSON.EJSON.parse(await readFile(filePath, "utf8"), { relaxed: false });
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an EJSON array in ${path.basename(filePath)}`);
  }
  return parsed as Document[];
}

async function readBackup(sourceDirectory: string): Promise<BackupData> {
  const manifest = JSON.parse(await readFile(path.join(sourceDirectory, "manifest.json"), "utf8")) as BackupManifest;
  const importReport = JSON.parse(await readFile(path.join(sourceDirectory, "import-report.json"), "utf8")) as ImportReport;
  if (importReport.importFormat !== IMPORT_FORMAT) {
    throw new Error(`Unsupported backup format: ${importReport.importFormat ?? "missing importFormat"}`);
  }

  const entries = new Map(manifest.collections.map((entry) => [entry.name, entry]));
  const documentsByCollection = new Map<RestoreCollectionName, Document[]>();
  for (const collectionName of RESTORE_COLLECTIONS) {
    const entry = entries.get(collectionName);
    if (!entry) {
      throw new Error(`Backup manifest does not contain ${collectionName}`);
    }
    if (entry.dataFile !== `${collectionName}.data.ejson`) {
      throw new Error(`Unexpected data file for ${collectionName}: ${entry.dataFile}`);
    }

    const documents = await readEjsonArray(path.join(sourceDirectory, entry.dataFile));
    if (documents.length !== entry.documents) {
      throw new Error(`Document count mismatch for ${collectionName}: manifest=${entry.documents}, data=${documents.length}`);
    }
    documentsByCollection.set(collectionName, documents);
  }

  return { sourceDirectory, manifest, importReport, documentsByCollection };
}

async function collectionExists(db: Db, name: string): Promise<boolean> {
  return (await db.listCollections({ name }, { nameOnly: true }).next()) !== null;
}

async function getLiveCounts(db: Db): Promise<Record<string, number>> {
  const names = [...RESTORE_COLLECTIONS, LEGACY_CONFIGS_COLLECTION];
  const counts = await Promise.all(names.map(async (name) => [name, (await collectionExists(db, name)) ? await db.collection(name).countDocuments() : 0] as const));
  return Object.fromEntries(counts);
}

function getUnresolvedCount(importReport: ImportReport): number {
  return Object.values(importReport.unresolved).reduce((total, entries) => total + entries.length, 0);
}

async function dropCollectionIfExists(db: Db, name: string): Promise<void> {
  if (await collectionExists(db, name)) {
    await db.collection(name).drop();
  }
}

async function stageBackup(db: Db, backup: BackupData, suffix: string): Promise<Map<RestoreCollectionName, string>> {
  const stagingNames = new Map<RestoreCollectionName, string>();
  for (const collectionName of RESTORE_COLLECTIONS) {
    const stagingName = `${collectionName}__new_schema_stage_${suffix}`;
    const documents = backup.documentsByCollection.get(collectionName)!;
    await dropCollectionIfExists(db, stagingName);
    await db.createCollection(stagingName);
    if (documents.length) {
      await db.collection(stagingName).insertMany(documents);
    }
    const count = await db.collection(stagingName).countDocuments();
    if (count !== documents.length) {
      throw new Error(`Staging verification failed for ${collectionName}: expected ${documents.length}, got ${count}`);
    }
    stagingNames.set(collectionName, stagingName);
  }
  return stagingNames;
}

async function rollbackSwaps(db: Db, swapped: SwapRecord[], suffix: string): Promise<void> {
  for (const swap of [...swapped].reverse()) {
    const failedNewName = `${swap.collectionName}__failed_new_${suffix}`;
    if (await collectionExists(db, swap.collectionName)) {
      await db.collection(swap.collectionName).rename(failedNewName);
    }
    if (swap.rollbackName && await collectionExists(db, swap.rollbackName)) {
      await db.collection(swap.rollbackName).rename(swap.collectionName);
    }
  }
}

async function replaceCollections(db: Db, backup: BackupData, suffix: string): Promise<void> {
  const stagingNames = await stageBackup(db, backup, suffix);
  const swapped: SwapRecord[] = [];

  try {
    for (const collectionName of RESTORE_COLLECTIONS) {
      const rollbackName = `${collectionName}__rollback_${suffix}`;
      if (await collectionExists(db, collectionName)) {
        await db.collection(collectionName).rename(rollbackName);
        swapped.push({ collectionName, rollbackName });
      } else {
        swapped.push({ collectionName });
      }
      await db.collection(stagingNames.get(collectionName)!).rename(collectionName);
    }

    const legacyRollbackName = `${LEGACY_CONFIGS_COLLECTION}__rollback_${suffix}`;
    if (await collectionExists(db, LEGACY_CONFIGS_COLLECTION)) {
      await db.collection(LEGACY_CONFIGS_COLLECTION).rename(legacyRollbackName);
      swapped.push({ collectionName: LEGACY_CONFIGS_COLLECTION, rollbackName: legacyRollbackName });
    }
  } catch (error) {
    await rollbackSwaps(db, swapped, suffix);
    throw error;
  }

  for (const swap of swapped) {
    if (swap.rollbackName) {
      await dropCollectionIfExists(db, swap.rollbackName);
    }
  }
}

async function run(): Promise<void> {
  const args = readArguments();
  const backup = await readBackup(args.sourceDirectory);
  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const db = client.db(connection.getDatabaseName());

  try {
    const sourceCounts = Object.fromEntries(
      RESTORE_COLLECTIONS.map((name) => [name, backup.documentsByCollection.get(name)!.length]),
    );
    const report = {
      mode: args.dryRun ? "dry-run" : "replace",
      database: connection.getDatabaseName(),
      sourceBackup: path.basename(backup.sourceDirectory),
      sourceDatabase: backup.manifest.dbName,
      sourceCounts,
      currentCounts: await getLiveCounts(db),
      unresolvedGamesExcluded: getUnresolvedCount(backup.importReport),
    };

    if (args.dryRun) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const suffix = `${Date.now()}_${process.pid}`;
    await replaceCollections(db, backup, suffix);
    console.log(JSON.stringify({ ...report, result: "replaced", currentCounts: await getLiveCounts(db) }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("New-schema backup restore failed", error);
  process.exit(1);
});
