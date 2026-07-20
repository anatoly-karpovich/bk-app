import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON, Int32, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

const DATA_COLLECTIONS = ["projects", "game_configs"] as const;
const EMPTY_GAME_COLLECTIONS = ["journey_games", "battleships_games", "lotto_games"] as const;

type ExportCollectionName = (typeof DATA_COLLECTIONS)[number] | (typeof EMPTY_GAME_COLLECTIONS)[number];

interface BackupManifestCollection {
  name: ExportCollectionName;
  documents: number;
  indexes: number;
  dataFile: string;
  indexesFile: string;
}

function getRequiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required argument ${name}`);
  }
  return path.resolve(value);
}

async function assertOutputDoesNotExist(outputDirectory: string): Promise<void> {
  try {
    await access(outputDirectory);
    throw new Error(`Refusing to overwrite existing backup directory: ${outputDirectory}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing to overwrite")) {
      throw error;
    }
  }
}

async function writeEjsonArray(directory: string, fileName: string, documents: Document[]): Promise<void> {
  await writeFile(path.join(directory, fileName), BSON.EJSON.stringify(documents, { relaxed: false }), "utf8");
}

function createDefaultIndexes(): Document[] {
  return [{ v: new Int32(2), key: { _id: new Int32(1) }, name: "_id_" }];
}

async function run(): Promise<void> {
  const outputDirectory = getRequiredArgument("--output");
  await assertOutputDoesNotExist(outputDirectory);

  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const db = client.db(connection.getDatabaseName());

  try {
    const documentsByCollection = new Map<ExportCollectionName, Document[]>();
    for (const collectionName of DATA_COLLECTIONS) {
      documentsByCollection.set(collectionName, await db.collection(collectionName).find({}).toArray());
    }
    for (const collectionName of EMPTY_GAME_COLLECTIONS) {
      documentsByCollection.set(collectionName, []);
    }

    await mkdir(outputDirectory, { recursive: false });
    const collections: BackupManifestCollection[] = [];
    for (const collectionName of [...DATA_COLLECTIONS, ...EMPTY_GAME_COLLECTIONS]) {
      const documents = documentsByCollection.get(collectionName)!;
      const dataFile = `${collectionName}.data.ejson`;
      const indexesFile = `${collectionName}.indexes.ejson`;
      await writeEjsonArray(outputDirectory, dataFile, documents);
      await writeEjsonArray(outputDirectory, indexesFile, createDefaultIndexes());
      collections.push({
        name: collectionName,
        documents: documents.length,
        indexes: 1,
        dataFile,
        indexesFile,
      });
    }

    await writeFile(
      path.join(outputDirectory, "manifest.json"),
      JSON.stringify({ exportedAt: new Date().toISOString(), dbName: connection.getDatabaseName(), collections }, null, 2),
      "utf8",
    );
    await writeFile(
      path.join(outputDirectory, "import-report.json"),
      JSON.stringify({ importFormat: "project-game-config-backup-v1", unresolved: {} }, null, 2),
      "utf8",
    );

    console.log(JSON.stringify({ outputDirectory, database: connection.getDatabaseName(), collections }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Start-data backup export failed", error);
  process.exit(1);
});
