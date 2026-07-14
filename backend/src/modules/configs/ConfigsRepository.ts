import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { AppConfig } from "./domain/types";

const CONFIGS_COLLECTION = "configs";
const CASE_INSENSITIVE_COLLATION = {
  locale: "en",
  strength: 2,
} as const;

export interface AppConfigDocument extends Omit<AppConfig, "createdAt" | "updatedAt"> {
  createdAt?: string;
  updatedAt?: string;
  id?: string;
}

export class ConfigsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async findAll(): Promise<Array<WithId<AppConfigDocument>>> {
    const collection = await this.getCollection();

    return collection
      .find({})
      .toArray();
  }

  async findById(configId: string): Promise<WithId<AppConfigDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(configId) });
  }

  async findByName(configName: string): Promise<WithId<AppConfigDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(
      { name: configName },
      {
        collation: CASE_INSENSITIVE_COLLATION,
      },
    );
  }

  async create(config: AppConfig): Promise<WithId<AppConfigDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(config);

    return collection.findOne({ _id: insertResult.insertedId });
  }

  async update(configId: string, config: AppConfig): Promise<WithId<AppConfigDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOneAndUpdate(
      { _id: this.toObjectId(configId) },
      {
        $set: config,
        $unset: {
          id: "",
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  async delete(configId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteOne({ _id: this.toObjectId(configId) });
    return deleteResult.deletedCount > 0;
  }

  async hasAnyConfigs(): Promise<boolean> {
    const collection = await this.getCollection();
    const count = await collection.countDocuments({}, { limit: 1 });
    return count > 0;
  }

  async insertInitial(configs: AppConfig[]): Promise<void> {
    if (!configs.length) {
      return;
    }

    const collection = await this.getCollection();
    await collection.insertMany(configs);
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<AppConfigDocument>(CONFIGS_COLLECTION);
  }

  private toObjectId(configId: string): ObjectId {
    return new ObjectId(configId);
  }
}
