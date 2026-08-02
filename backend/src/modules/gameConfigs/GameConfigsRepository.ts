import { ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { AnyGameConfig, GameConfigDocument, GameType } from "./domain/types";

const GAME_CONFIGS_COLLECTION = "game_configs";

export class GameConfigsRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async findByProjectIdAndGameType(
    projectId: string,
    gameType: GameType,
  ): Promise<Array<WithId<GameConfigDocument>>> {
    const collection = await this.getCollection();

    return collection.find({ projectId, gameType }).toArray();
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<GameConfigDocument>>> {
    const collection = await this.getCollection();
    return collection.find({ projectId }).toArray();
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

  async assignBootstrapOwnership(userId: string): Promise<void> {
    await (await this.getCollection()).updateMany({}, { $set: { isSystem: true, createdByUserId: userId, updatedByUserId: userId } });
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<GameConfigDocument>(GAME_CONFIGS_COLLECTION);
  }

  private toObjectId(gameConfigId: string): ObjectId {
    return new ObjectId(gameConfigId);
  }
}
