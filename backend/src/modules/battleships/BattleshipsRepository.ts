import { ObjectId, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { BattleshipsGame } from "./domain/types";
import { InvalidBattleshipsGameIdError } from "./errors";

const BATTLESHIPS_GAMES_COLLECTION = "battleships_games";

export interface BattleshipsGameDocument extends BattleshipsGame {
  createdAt: string;
  updatedAt: string;
}

export class BattleshipsRepository {
  async findById(gameId: string): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId) });
  }

  async findLatest(status?: BattleshipsGame["status"]): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(status ? { status } : {}, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async findAll(): Promise<Array<WithId<BattleshipsGameDocument>>> {
    const collection = await this.getCollection();

    return collection
      .find(
        {},
        {
          sort: {
            updatedAt: -1,
            createdAt: -1,
          },
        },
      )
      .toArray();
  }

  async create(game: BattleshipsGame): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game);

    return collection.findOne({ _id: insertResult.insertedId });
  }

  async update(gameId: string, game: BattleshipsGame): Promise<WithId<BattleshipsGameDocument> | null> {
    const collection = await this.getCollection();
    const persistedGame = this.toPersistedGame(game);

    return collection.findOneAndUpdate(
      { _id: this.toObjectId(gameId) },
      {
        $set: persistedGame,
      },
      {
        returnDocument: "after",
      },
    );
  }

  async delete(gameId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const deleteResult = await collection.deleteOne({ _id: this.toObjectId(gameId) });
    return deleteResult.deletedCount > 0;
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
