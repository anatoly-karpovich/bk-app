import { loadEnvironment } from "../../bootstrap/loadEnvironment";
import { MongoConnection } from "./MongoConnection";
import { MongoDatabase } from "./MongoDatabase";

const DEFAULT_DB_NAME = "bk-app";

let mongoConnection: MongoConnection | null = null;
let mongoDatabase: MongoDatabase | null = null;

export function getDefaultMongoConnection(): MongoConnection {
  if (!mongoConnection) {
    loadEnvironment();
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME ?? DEFAULT_DB_NAME;

    if (!mongoUri) {
      throw new Error("Missing required environment variable MONGODB_URI");
    }

    mongoConnection = new MongoConnection(mongoUri, dbName);
  }

  return mongoConnection;
}

export function getDefaultMongoDatabase(): MongoDatabase {
  if (!mongoDatabase) {
    mongoDatabase = new MongoDatabase(getDefaultMongoConnection());
  }

  return mongoDatabase;
}
