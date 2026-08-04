import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { QuizEventDocument } from "./domain/types";

const COLLECTION = "quizEvents";
export class QuizEventsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}
  async ensureIndexes(): Promise<void> {
    const collection = await this.collection();
    await Promise.all([
      collection.createIndex({ projectId: 1, status: 1, updatedAt: -1 }),
      collection.createIndex({ projectId: 1, quizId: 1, createdAt: -1 }),
      collection.createIndex({ projectId: 1, hostUserId: 1, updatedAt: -1 }),
    ]);
  }
  async findByProjectId(projectId: string): Promise<Array<WithId<QuizEventDocument>>> { return (await this.collection()).find({ projectId }).sort({ updatedAt: -1 }).toArray(); }
  async findByIdAndProjectId(id: string, projectId: string): Promise<WithId<QuizEventDocument> | null> { return (await this.collection()).findOne({ _id: this.objectId(id), projectId }); }
  async create(event: QuizEventDocument): Promise<WithId<QuizEventDocument> | null> { const c = await this.collection(); const result = await c.insertOne(event); return c.findOne({ _id: result.insertedId }); }
  async update(id: string, projectId: string, event: QuizEventDocument): Promise<WithId<QuizEventDocument> | null> {
    const { _id: _ignoredId, ...document } = event as WithId<QuizEventDocument>;
    return (await this.collection()).findOneAndUpdate({ _id: this.objectId(id), projectId }, { $set: document }, { returnDocument: "after" });
  }
  async delete(id: string, projectId: string): Promise<boolean> { return (await this.collection()).deleteOne({ _id: this.objectId(id), projectId }).then((result) => result.deletedCount === 1); }
  async deleteByProjectId(projectId: string): Promise<void> { await (await this.collection()).deleteMany({ projectId }); }
  private collection() { return this.mongoDatabase.getCollection<QuizEventDocument>(COLLECTION); }
  private objectId(id: string): ObjectId { return new ObjectId(id); }
}
