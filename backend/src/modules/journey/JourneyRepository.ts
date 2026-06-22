import { ObjectId, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { JourneyGame } from "./domain/types";
import { InvalidJourneyGameIdError } from "./errors";

const JOURNEY_GAMES_COLLECTION = "journey_games";

export interface JourneyGameDocument extends JourneyGame {
  createdAt: string;
  updatedAt: string;
}

export class JourneyRepository {
  async findById(gameId: string): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId) });
  }

  async findLatest(status?: JourneyGame["status"]): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();

    return collection.findOne(status ? { status } : {}, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async create(game: JourneyGame): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game);

    return collection.findOne({ _id: insertResult.insertedId });
  }

  async update(gameId: string, game: JourneyGame): Promise<WithId<JourneyGameDocument> | null> {
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
    return getDefaultMongoDatabase().getCollection<JourneyGameDocument>(JOURNEY_GAMES_COLLECTION);
  }

  private toObjectId(gameId: string): ObjectId {
    if (!ObjectId.isValid(gameId)) {
      throw new InvalidJourneyGameIdError(gameId);
    }

    return new ObjectId(gameId);
  }

  private toPersistedGame(game: JourneyGame): JourneyGameDocument {
    const {
      _id: _ignoredId,
      id: _ignoredPublicId,
      ...persistedGame
    } = game as JourneyGame & {
      _id?: ObjectId;
      id?: string;
    };

    return persistedGame as JourneyGameDocument;
  }
}
