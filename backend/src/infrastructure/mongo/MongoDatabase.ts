import type { ClientSession, Collection, Document } from "mongodb";
import { MongoConnection } from "./MongoConnection";

export class MongoDatabase {
  constructor(private readonly connection: MongoConnection) {}

  async getCollection<TSchema extends Document = Document>(collectionName: string): Promise<Collection<TSchema>> {
    const client = await this.connection.getClient();
    return client.db(this.connection.getDatabaseName()).collection<TSchema>(collectionName);
  }

  async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const client = await this.connection.getClient();
    const session = client.startSession();
    try {
      return await session.withTransaction(operation);
    } finally {
      await session.endSession();
    }
  }
}
