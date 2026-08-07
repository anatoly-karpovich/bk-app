import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import { createQuizCreatorReadProjection, type QuizCreatorReadFields } from "./QuizCreatorReadProjection";
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

  async findReadByProjectId(projectId: string): Promise<Array<WithId<QuizDocument> & QuizCreatorReadFields>> {
    return (await this.collection())
      .aggregate<WithId<QuizDocument> & QuizCreatorReadFields>([
        ...createQuizCreatorReadProjection({ projectId }),
        { $sort: { updatedAt: -1 } },
      ])
      .toArray();
  }

  async findByIdAndProjectId(id: string, projectId: string): Promise<WithId<QuizDocument> | null> {
    return (await this.collection()).findOne({ _id: this.objectId(id), projectId });
  }

  async findReadByIdAndProjectId(id: string, projectId: string): Promise<(WithId<QuizDocument> & QuizCreatorReadFields) | null> {
    return (await this.collection())
      .aggregate<WithId<QuizDocument> & QuizCreatorReadFields>(createQuizCreatorReadProjection({ _id: this.objectId(id), projectId }))
      .next();
  }

  async create(quiz: QuizDocument): Promise<WithId<QuizDocument> | null> {
    const collection = await this.collection();
    const result = await collection.insertOne(quiz);
    return collection.findOne({ _id: result.insertedId });
  }

  async update(id: string, projectId: string, quiz: QuizDocument): Promise<WithId<QuizDocument> | null> {
    const { _id: _ignoredId, ...document } = quiz as WithId<QuizDocument>;
    return (await this.collection()).findOneAndUpdate({ _id: this.objectId(id), projectId }, { $set: document }, { returnDocument: "after" });
  }

  async attachEvent(id: string, projectId: string, eventId: string): Promise<WithId<QuizDocument> | null> {
    return (await this.collection()).findOneAndUpdate(
      { _id: this.objectId(id), projectId, $or: [{ eventId: null }, { eventId: { $exists: false } }] },
      { $set: { eventId, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" },
    );
  }

  async clearEvent(id: string, projectId: string, eventId: string): Promise<void> {
    await (await this.collection()).updateOne(
      { _id: this.objectId(id), projectId, eventId },
      { $set: { eventId: null, updatedAt: new Date().toISOString() } },
    );
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
