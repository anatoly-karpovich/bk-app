import { ObjectId, type Filter, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { UserDocument, UserRole, UserStatus } from "./domain/types";

const USERS_COLLECTION = "users";

export interface UsersListOptions {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  pageSize: number;
}

export class UsersRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await Promise.all([
      collection.createIndex({ login: 1 }, { unique: true }),
      collection.createIndex({ role: 1, status: 1, displayName: 1 }),
      collection.createIndex({ "projectProfiles.projectId": 1 }),
    ]);
  }

  async countDocuments(filter: Filter<UserDocument> = {}): Promise<number> {
    return (await this.getCollection()).countDocuments(filter);
  }

  async findById(id: string): Promise<WithId<UserDocument> | null> {
    if (!ObjectId.isValid(id)) return null;
    return (await this.getCollection()).findOne({ _id: new ObjectId(id) });
  }

  async findByLogin(login: string): Promise<WithId<UserDocument> | null> {
    return (await this.getCollection()).findOne({ login });
  }

  async create(user: UserDocument): Promise<WithId<UserDocument>> {
    const result = await (await this.getCollection()).insertOne(user);
    return { _id: result.insertedId, ...user };
  }

  async updateById(id: string, update: Partial<UserDocument>): Promise<WithId<UserDocument> | null> {
    if (!ObjectId.isValid(id)) return null;
    return (await this.getCollection()).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" },
    );
  }

  async removeProjectProfiles(projectId: string): Promise<void> {
    await (await this.getCollection()).updateMany({}, { $pull: { projectProfiles: { projectId } } });
  }

  async list(options: UsersListOptions): Promise<{ items: WithId<UserDocument>[]; total: number }> {
    const filter: Filter<UserDocument> = {};
    if (options.role) filter.role = options.role;
    if (options.status) filter.status = options.status;
    if (options.search) {
      filter.$or = [
        { login: { $regex: escapeRegex(options.search), $options: "i" } },
        { displayName: { $regex: escapeRegex(options.search), $options: "i" } },
      ];
    }
    const collection = await this.getCollection();
    const [items, total] = await Promise.all([
      collection.find(filter).sort({ displayName: 1 }).skip((options.page - 1) * options.pageSize).limit(options.pageSize).toArray(),
      collection.countDocuments(filter),
    ]);
    return { items, total };
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<UserDocument>(USERS_COLLECTION);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
