import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { SessionDocument } from "./domain/types";

const SESSIONS_COLLECTION = "sessions";

export class SessionsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await Promise.all([
      collection.createIndex({ tokenHash: 1 }, { unique: true }),
      collection.createIndex({ userId: 1 }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  }

  async create(session: SessionDocument): Promise<WithId<SessionDocument>> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(session);
    return { _id: result.insertedId, ...session };
  }

  async findByTokenHash(tokenHash: string): Promise<WithId<SessionDocument> | null> {
    return (await this.getCollection()).findOne({ tokenHash });
  }

  async touch(id: ObjectId, lastActivityAt: Date, expiresAt: Date): Promise<void> {
    await (await this.getCollection()).updateOne({ _id: id }, { $set: { lastActivityAt, expiresAt } });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await (await this.getCollection()).deleteOne({ tokenHash });
  }

  async deleteById(id: ObjectId): Promise<void> {
    await (await this.getCollection()).deleteOne({ _id: id });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await (await this.getCollection()).deleteMany({ userId });
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<SessionDocument>(SESSIONS_COLLECTION);
  }
}
