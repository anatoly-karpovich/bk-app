import { ObjectId, type ClientSession, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import type { JourneyGameStatus, JourneyV2Game } from "./domain/types";
import { InvalidJourneyGameIdError } from "./errors";

const JOURNEY_GAMES_COLLECTION = "journey_games";

export type JourneyGameDocument = JourneyV2Game;

export class JourneyRepository {
  async findByIdAndProjectId(gameId: string, projectId: string): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(gameId), projectId });
  }

  async findLatest(projectId: string, status?: JourneyGameStatus): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();
    const query = status ? { projectId, "stateV2.status": status } : { projectId };

    return collection.findOne(query, {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    });
  }

  async findByProjectId(projectId: string): Promise<Array<WithId<JourneyGameDocument>>> {
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

  async create(game: JourneyGameDocument, session?: ClientSession): Promise<WithId<JourneyGameDocument> | null> {
    const collection = await this.getCollection();
    const insertResult = await collection.insertOne(game, { session });

    return collection.findOne({ _id: insertResult.insertedId }, { session });
  }

  async update(gameId: string, projectId: string, game: JourneyGameDocument): Promise<WithId<JourneyGameDocument> | null> {
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
    return getDefaultMongoDatabase().getCollection<JourneyGameDocument>(JOURNEY_GAMES_COLLECTION);
  }

  private toObjectId(gameId: string): ObjectId {
    if (!ObjectId.isValid(gameId)) {
      throw new InvalidJourneyGameIdError(gameId);
    }

    return new ObjectId(gameId);
  }

  private toPersistedGame(game: JourneyGameDocument): JourneyGameDocument {
    const {
      _id: _ignoredId,
      id: _ignoredPublicId,
      ...persistedGame
    } = game as JourneyGameDocument & {
      _id?: ObjectId;
      id?: string;
    };

    return persistedGame as JourneyGameDocument;
  }
}
