import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";

export class PlayerReferencesRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async hasSavedGameReference(projectId: string, playerRefId: string): Promise<boolean> {
    const [journey, battleships, lotto, lottoBingo, quizEvents] = await Promise.all([
      this.mongoDatabase.getCollection("journey_games").then((collection) =>
        collection.findOne({ projectId, "stateV2.players.playerRefId": playerRefId }),
      ),
      this.mongoDatabase.getCollection("battleships_games").then((collection) =>
        collection.findOne({ projectId, playerRefId }),
      ),
      this.mongoDatabase.getCollection("lotto_games").then((collection) =>
        collection.findOne({ projectId, "players.playerRefId": playerRefId }),
      ),
      this.mongoDatabase.getCollection("lotto_bingo_games").then((collection) =>
        collection.findOne({ projectId, "players.playerRefId": playerRefId }),
      ),
      this.mongoDatabase.getCollection("quizEvents").then((collection) =>
        collection.findOne({
          projectId,
          $or: [
            { "questions.selectedAnswers.playerRefId": playerRefId },
            { "questions.awards.playerRefId": playerRefId },
            { "summary.players.playerRefId": playerRefId },
          ],
        }),
      ),
    ]);
    return Boolean(journey || battleships || lotto || lottoBingo || quizEvents);
  }
}
