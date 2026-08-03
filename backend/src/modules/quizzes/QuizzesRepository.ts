import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { QuizDocument } from "./domain/types";

const COLLECTION = "quizzes";

export class QuizzesRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.collection();
    await Promise.all([
      collection.createIndex({ projectId: 1, updatedAt: -1 }),
      collection.createIndex({ projectId: 1, createdByUserId: 1, updatedAt: -1 }),
      collection.createIndex({ projectId: 1, configId: 1, createdAt: -1 }),
    ]);
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<QuizDocument>>> {
    return (await this.collection()).find({ projectId }).sort({ updatedAt: -1 }).toArray();
  }

  async findByIdAndProjectId(id: string, projectId: string): Promise<WithId<QuizDocument> | null> {
    return (await this.collection()).findOne({ _id: this.objectId(id), projectId });
  }

  async create(quiz: QuizDocument): Promise<WithId<QuizDocument> | null> {
    const collection = await this.collection();
    const result = await collection.insertOne(quiz);
    return collection.findOne({ _id: result.insertedId });
  }

  async update(id: string, projectId: string, quiz: QuizDocument): Promise<WithId<QuizDocument> | null> {
    return (await this.collection()).findOneAndUpdate({ _id: this.objectId(id), projectId }, { $set: quiz }, { returnDocument: "after" });
  }

  async delete(id: string, projectId: string): Promise<boolean> {
    return (await this.collection()).deleteOne({ _id: this.objectId(id), projectId }).then((result) => result.deletedCount === 1);
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await (await this.collection()).deleteMany({ projectId });
  }

  private collection() { return this.mongoDatabase.getCollection<QuizDocument>(COLLECTION); }
  private objectId(id: string): ObjectId { return new ObjectId(id); }
}
