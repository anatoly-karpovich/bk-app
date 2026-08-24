import { ObjectId, type ClientSession, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { BattleshipsGame } from "./domain/types";
import { InvalidBattleshipsGameIdError } from "./errors";

const BATTLESHIPS_GAMES_COLLECTION = "battleships_games";

export interface BattleshipsGameDocument extends BattleshipsGame {
  createdAt: string;
  updatedAt: string;
}

export class BattleshipsRepository {
  async findByIdAndProjectId(gameId: string, projectId: string): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId), projectId });
  }

  async findLatest(projectId: string, status?: BattleshipsGame["status"]): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(status ? { projectId, status } : { projectId }, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<BattleshipsGameDocument>>> {
    const collection = await this.getCollection();

    return collection
      .find(
        { projectId },
        {
          sort: {
            updatedAt: -1,
            createdAt: -1,
          },
        },
      )
      .toArray();
  }

  async create(game: BattleshipsGame, session?: ClientSession): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game, { session });

    return collection.findOne({ _id: insertResult.insertedId }, { session });
  }

  async update(gameId: string, projectId: string, game: BattleshipsGame): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    const persistedGame = this.toPersistedGame(game);

    return collection.findOneAndUpdate(
      { _id: this.toObjectId(gameId), projectId },
      {
        $set: persistedGame,
      },
      {
        returnDocument: "after",
      },
    );
  }

  async delete(gameId: string, projectId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteOne({ _id: this.toObjectId(gameId), projectId });
    return deleteResult.deletedCount > 0;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({ projectId });
  }

  private async getCollection() {
    return getDefaultMongoDatabase().getCollection<BattleshipsGameDocument>(BATTLESHIPS_GAMES_COLLECTION);
  }

  private toObjectId(gameId: string): ObjectId {
    if (!ObjectId.isValid(gameId)) {
      throw new InvalidBattleshipsGameIdError(gameId);
    }

    return new ObjectId(gameId);
  }

  private toPersistedGame(game: BattleshipsGame): BattleshipsGameDocument {
    const {
      _id: _ignoredId,
      id: _ignoredPublicId,
      ...persistedGame
    } = game as BattleshipsGame & {
      _id?: ObjectId;
      id?: string;
    };

    return persistedGame as BattleshipsGameDocument;
  }
}
