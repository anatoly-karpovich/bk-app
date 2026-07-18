import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { AnyGameConfig, GameConfigDocument, GameType } from "./domain/types";

const GAME_CONFIGS_COLLECTION = "game_configs";

export class GameConfigsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await collection.createIndex(
      { projectId: 1, gameType: 1, name: 1 },
      { unique: true, name: "project_game_type_name_unique" },
    );
    await collection.createIndex(
      { projectId: 1, gameType: 1, legacyConfigId: 1 },
      {
        unique: true,
        sparse: true,
        name: "project_game_type_legacy_config_unique",
      },
    );
  }

  async findByProjectIdAndGameType(
    projectId: string,
    gameType: GameType,
  ): Promise<Array<WithId<GameConfigDocument>>> {
    const collection = await this.getCollection();

    return collection.find({ projectId, gameType }).toArray();
  }

  async findByIdAndProjectId(
    gameConfigId: string,
    projectId: string,
  ): Promise<WithId<GameConfigDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameConfigId), projectId });
  }

  async findByProjectIdGameTypeAndName(
    projectId: string,
    gameType: GameType,
    name: string,
  ): Promise<WithId<GameConfigDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ projectId, gameType, name });
  }

  async create(config: GameConfigDocument): Promise<WithId<GameConfigDocument> | null> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(config);
    return collection.findOne({ _id: result.insertedId });
  }

  async update(
    projectId: string,
    gameConfigId: string,
    config: GameConfigDocument,
  ): Promise<WithId<GameConfigDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOneAndUpdate(
      { _id: this.toObjectId(gameConfigId), projectId },
      { $set: config },
      { returnDocument: "after" },
    );
  }

  async delete(projectId: string, gameConfigId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(gameConfigId), projectId });
    return result.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({ projectId });
  }

  async upsertByLegacyIdentity(
    projectId: string,
    gameType: GameType,
    legacyConfigId: string,
    config: AnyGameConfig,
  ): Promise<WithId<GameConfigDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOneAndUpdate(
      { projectId, gameType, legacyConfigId },
      {
        $set: {
          ...config,
          projectId,
          gameType,
          legacyConfigId,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<GameConfigDocument>(GAME_CONFIGS_COLLECTION);
  }

  private toObjectId(gameConfigId: string): ObjectId {
    return new ObjectId(gameConfigId);
  }
}
