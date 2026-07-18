import { ObjectId, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { LottoGame } from "./domain/types";
import { InvalidLottoGameIdError } from "./errors";

const LOTTO_GAMES_COLLECTION = "lotto_games";

export interface LottoGameDocument extends LottoGame {}

export class LottoRepository {
  async findByIdAndProjectId(gameId: string, projectId: string): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId), projectId });
  }

  async findLatest(projectId: string, status?: LottoGame["status"]): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(status ? { projectId, status } : { projectId }, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<LottoGameDocument>>> {
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

  async create(game: LottoGame): Promise<WithId<LottoGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game);

    return collection.findOne({ _id: insertResult.insertedId });
  }

  async update(gameId: string, projectId: string, game: LottoGame): Promise<WithId<LottoGameDocument> | null> {
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
