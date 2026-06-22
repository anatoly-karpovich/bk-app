import { MongoClient } from "mongodb";

const DEFAULT_DB_NAME = "bk-app";

export class MongoConnection {
  private clientPromise: Promise<MongoClient> | null = null;

  constructor(
    private readonly mongoUri: string,
    private readonly dbName = DEFAULT_DB_NAME,
  ) {}

  async connect(): Promise<void> {
    await this.getClient();
  }

  getDatabaseName(): string {
    return this.dbName;
  }

  async getClient(): Promise<MongoClient> {
    if (!this.mongoUri) {
      throw new Error("Missing required environment variable MONGODB_URI");
    }

    if (!this.clientPromise) {
      const client = new MongoClient(this.mongoUri);
      this.clientPromise = client.connect();
    }

    return this.clientPromise;
  }
}
