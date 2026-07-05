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
      configs.flatMap((config) => {
        const operations = [
          collection.updateOne(
            { id: config.id },
            {
              $setOnInsert: config,
            },
            { upsert: true },
          ),
        ];

        if (config.games.battleships) {
          operations.push(
            collection.updateOne(
              {
                id: config.id,
                "games.battleships": { $exists: false },
              },
              {
                $set: {
                  "games.battleships": config.games.battleships,
                },
              },
            ),
          );
        }

        return operations;
      }),
    );
  }
}
