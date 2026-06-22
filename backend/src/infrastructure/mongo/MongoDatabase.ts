import type { Collection, Document } from "mongodb";
import { MongoConnection } from "./MongoConnection";

export class MongoDatabase {
  constructor(private readonly connection: MongoConnection) {}

  async getCollection<TSchema extends Document = Document>(collectionName: string): Promise<Collection<TSchema>> {
    const client = await this.connection.getClient();
    return client.db(this.connection.getDatabaseName()).collection<TSchema>(collectionName);
  }
}
