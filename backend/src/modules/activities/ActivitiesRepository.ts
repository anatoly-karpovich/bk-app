import { ObjectId, type ClientSession, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { ActivityResultDocument } from "./domain/types";

const COLLECTION = "activity_results";

export class ActivitiesRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.collection();
    await Promise.all([
      collection.createIndex({ projectId: 1, conductedOn: -1 }),
      collection.createIndex({ projectId: 1, hostUserId: 1, updatedAt: -1 }),
    ]);
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<ActivityResultDocument>>> {
    return (await this.collection()).find({ projectId }).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  }

  async findByIdAndProjectId(
    activityId: string,
    projectId: string,
    session?: ClientSession,
  ): Promise<WithId<ActivityResultDocument> | null> {
    if (!ObjectId.isValid(activityId)) return null;
    return (await this.collection()).findOne({ _id: new ObjectId(activityId), projectId }, { session });
  }

  async create(
    activity: ActivityResultDocument,
    session?: ClientSession,
  ): Promise<WithId<ActivityResultDocument> | null> {
    const collection = await this.collection();
    const result = await collection.insertOne(activity, { session });
    return collection.findOne({ _id: result.insertedId }, { session });
  }

  async update(
    activityId: string,
    projectId: string,
    expectedRevision: number,
    activity: ActivityResultDocument,
    session?: ClientSession,
  ): Promise<WithId<ActivityResultDocument> | null> {
    if (!ObjectId.isValid(activityId)) return null;
    const { _id: _ignoredId, ...document } = activity as WithId<ActivityResultDocument>;
    return (await this.collection()).findOneAndUpdate(
      { _id: new ObjectId(activityId), projectId, revision: expectedRevision },
      { $set: { ...document, revision: expectedRevision + 1 } },
      { returnDocument: "after", session },
    );
  }

  async delete(activityId: string, projectId: string, expectedRevision: number): Promise<boolean> {
    if (!ObjectId.isValid(activityId)) return false;
    const result = await (await this.collection()).deleteOne({
      _id: new ObjectId(activityId),
      projectId,
      revision: expectedRevision,
    });
    return result.deletedCount === 1;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await (await this.collection()).deleteMany({ projectId });
  }

  private collection() {
    return this.mongoDatabase.getCollection<ActivityResultDocument>(COLLECTION);
  }
}
