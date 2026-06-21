import { Collection, Document, MongoClient } from "mongodb";

const DEFAULT_DB_NAME = "bk-app";

process.loadEnvFile();

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? DEFAULT_DB_NAME;

let clientPromise: Promise<MongoClient> | null = null;

function getMongoClient(): Promise<MongoClient> {
  if (!mongoUri) {
    throw new Error("Missing required environment variable MONGODB_URI");
  }

  if (!clientPromise) {
    const client = new MongoClient(mongoUri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function ensureMongoConnection(): Promise<void> {
  await getMongoClient();
}

export async function getMongoCollection<TSchema extends Document = Document>(
  collectionName: string,
): Promise<Collection<TSchema>> {
  const client = await getMongoClient();
  return client.db(dbName).collection<TSchema>(collectionName);
}
