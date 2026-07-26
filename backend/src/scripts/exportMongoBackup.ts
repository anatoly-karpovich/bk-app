import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BSON, type Document } from "mongodb";
import { loadEnvironment } from "../bootstrap/loadEnvironment";
import { getDefaultMongoConnection } from "../infrastructure/mongo/defaultMongo";

interface BackupManifestCollection {
  name: string;
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

async function writeEjson(directory: string, fileName: string, value: unknown): Promise<void> {
  await writeFile(path.join(directory, fileName), BSON.EJSON.stringify(value, { relaxed: false }), "utf8");
}

async function run(): Promise<void> {
  const outputDirectory = getRequiredArgument("--output");
  await assertOutputDoesNotExist(outputDirectory);

  loadEnvironment();
  const connection = getDefaultMongoConnection();
  const client = await connection.getClient();
  const db = client.db(connection.getDatabaseName());

  try {
    const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray();
    await mkdir(outputDirectory, { recursive: false });

    const collections: BackupManifestCollection[] = [];
    for (const { name } of collectionInfos.sort((left, right) => left.name.localeCompare(right.name))) {
      const collection = db.collection<Document>(name);
      const documents = await collection.find({}).toArray();
      const indexes = await collection.listIndexes().toArray();
      const dataFile = `${name}.data.ejson`;
      const indexesFile = `${name}.indexes.ejson`;
      await writeEjson(outputDirectory, dataFile, documents);
      await writeEjson(outputDirectory, indexesFile, indexes);
      collections.push({ name, documents: documents.length, indexes: indexes.length, dataFile, indexesFile });
    }

    await writeFile(
      path.join(outputDirectory, "manifest.json"),
      JSON.stringify({ exportedAt: new Date().toISOString(), dbName: connection.getDatabaseName(), collections }, null, 2),
      "utf8",
    );
    console.log(JSON.stringify({ outputDirectory, database: connection.getDatabaseName(), collections }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("MongoDB backup export failed", error);
  process.exit(1);
});
