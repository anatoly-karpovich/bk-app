import type { AppConfig } from "./domain/types";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";

const CONFIGS_COLLECTION = "configs";

export class ConfigsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async findAll(): Promise<AppConfig[]> {
    const collection = await this.mongoDatabase.getCollection<AppConfig>(CONFIGS_COLLECTION);
    return collection.find({}).toArray();
  }

  async findById(configId: string): Promise<AppConfig | null> {
    const collection = await this.mongoDatabase.getCollection<AppConfig>(CONFIGS_COLLECTION);
    return collection.findOne({ id: configId });
  }

  async upsertDefaults(configs: AppConfig[]): Promise<void> {
    const collection = await this.mongoDatabase.getCollection<AppConfig>(CONFIGS_COLLECTION);

    await Promise.all(
      configs.map((config) =>
        collection.updateOne(
          { id: config.id },
          {
            $setOnInsert: config,
          },
          { upsert: true },
        ),
      ),
    );
  }
}
