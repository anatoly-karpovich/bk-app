import { MongoServerError, ObjectId, type WithId } from "mongodb";
import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";
import type { Player, PlayerAlias } from "./domain/types";

const PLAYERS_COLLECTION = "players";

export class PlayersRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await Promise.all([
      collection.createIndex({ projectId: 1, "aliases.key": 1 }, { unique: true }),
      collection.createIndex({ projectId: 1, updatedAt: -1 }),
    ]);
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<Player>>> {
    return (await this.getCollection()).find({ projectId }).toArray();
  }

  async findByIdAndProjectId(playerId: string, projectId: string): Promise<WithId<Player> | null> {
    if (!ObjectId.isValid(playerId)) return null;
    return (await this.getCollection()).findOne({ _id: new ObjectId(playerId), projectId });
  }

  async findByProjectIdAndAliasKey(projectId: string, aliasKey: string): Promise<WithId<Player> | null> {
    return (await this.getCollection()).findOne({ projectId, "aliases.key": aliasKey });
  }

  async create(player: Player): Promise<WithId<Player>> {
    const result = await (await this.getCollection()).insertOne(player);
    return { _id: result.insertedId, ...player };
  }

  async upsertFromMigration(
    projectId: string,
    nickname: string,
    aliasKey: string,
    aliases: PlayerAlias[],
    now: string,
  ): Promise<{ created: boolean }> {
    const collection = await this.getCollection();
    const existing = await collection.findOne({ projectId, "aliases.key": aliasKey });
    if (existing) {
      await this.addMigrationAliases(existing._id, aliases, now);
      return { created: false };
    }

    try {
      await collection.insertOne({
        projectId,
        nickname,
        aliases,
        createdAt: now,
        updatedAt: now,
      });
      return { created: true };
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      const concurrentPlayer = await collection.findOne({ projectId, "aliases.key": aliasKey });
      if (!concurrentPlayer) throw error;
      await this.addMigrationAliases(concurrentPlayer._id, aliases, now);
      return { created: false };
    }
  }

  async update(playerId: string, projectId: string, player: Player): Promise<WithId<Player> | null> {
    if (!ObjectId.isValid(playerId)) return null;
    return (await this.getCollection()).findOneAndUpdate(
      { _id: new ObjectId(playerId), projectId },
      { $set: player },
      { returnDocument: "after" },
    );
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await (await this.getCollection()).deleteMany({ projectId });
  }

  private async getCollection() {
    return this.mongoDatabase.getCollection<Player>(PLAYERS_COLLECTION);
  }

  private async addMigrationAliases(playerId: ObjectId, aliases: PlayerAlias[], now: string): Promise<void> {
    await (await this.getCollection()).updateOne(
      { _id: playerId },
      { $set: { updatedAt: now }, $addToSet: { aliases: { $each: aliases } } },
    );
  }
}
