import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { QuizConfigDocument } from "./domain/types";

const COLLECTION = "quizConfigs";

export class QuizConfigsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.collection();
    await Promise.all([
      collection.createIndex({ projectId: 1, updatedAt: -1 }),
      collection.createIndex({ projectId: 1, name: 1 }, { unique: true }),
      collection.createIndex({ projectId: 1, isSystem: 1, updatedAt: -1 }),
    ]);
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<QuizConfigDocument>>> {
    return (await this.collection()).find({ projectId }).sort({ updatedAt: -1 }).toArray();
  }

  async findByIdAndProjectId(id: string, projectId: string): Promise<WithId<QuizConfigDocument> | null> {
    return (await this.collection()).findOne({ _id: this.objectId(id), projectId });
  }

  async findByProjectIdAndName(projectId: string, name: string): Promise<WithId<QuizConfigDocument> | null> {
    return (await this.collection()).findOne({ projectId, name });
  }

  async create(config: QuizConfigDocument): Promise<WithId<QuizConfigDocument> | null> {
    const collection = await this.collection();
    const result = await collection.insertOne(config);
    return collection.findOne({ _id: result.insertedId });
  }

  async update(id: string, projectId: string, config: QuizConfigDocument): Promise<WithId<QuizConfigDocument> | null> {
    return (await this.collection()).findOneAndUpdate({ _id: this.objectId(id), projectId }, { $set: config }, { returnDocument: "after" });
  }

  async delete(id: string, projectId: string): Promise<boolean> {
    return (await this.collection()).deleteOne({ _id: this.objectId(id), projectId }).then((result) => result.deletedCount === 1);
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await (await this.collection()).deleteMany({ projectId });
  }

  private collection() { return this.mongoDatabase.getCollection<QuizConfigDocument>(COLLECTION); }
  private objectId(id: string): ObjectId { return new ObjectId(id); }
}
