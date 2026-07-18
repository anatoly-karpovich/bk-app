import { ObjectId, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { LottoGame } from "./domain/types";
import { InvalidLottoGameIdError } from "./errors";

const LOTTO_GAMES_COLLECTION = "lotto_games";

export interface LottoGameDocument extends LottoGame {}

export class LottoRepository {
  async findById(gameId: string): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId) });
  }

  async findLatest(status?: LottoGame["status"]): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(status ? { status } : {}, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async findAll(): Promise<Array<WithId<LottoGameDocument>>> {
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

  async create(game: LottoGame): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game);

    return collection.findOne({ _id: insertResult.insertedId });
  }

  async update(gameId: string, game: LottoGame): Promise<WithId<LottoGameDocument> | null> {
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
    return getDefaultMongoDatabase().getCollection<LottoGameDocument>(LOTTO_GAMES_COLLECTION);
  }

  private toObjectId(gameId: string): ObjectId {
    if (!ObjectId.isValid(gameId)) {
      throw new InvalidLottoGameIdError(gameId);
    }

    return new ObjectId(gameId);
  }

  private toPersistedGame(game: LottoGame): LottoGameDocument {
    const {
      _id: _ignoredId,
      id: _ignoredPublicId,
      ...persistedGame
    } = game as LottoGame & {
      _id?: ObjectId;
      id?: string;
    };

    return persistedGame as LottoGameDocument;
  }
}
