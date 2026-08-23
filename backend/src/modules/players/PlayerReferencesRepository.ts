import type { MongoDatabase } from "../../infrastructure/mongo/MongoDatabase";

export class PlayerReferencesRepository {
  constructor(private readonly mongoDatabase: MongoDatabase) {}

  async hasSavedGameReference(projectId: string, playerRefId: string, nickname: string): Promise<boolean> {
    const [journey, battleships, lotto, lottoBingo, quizEvents] = await Promise.all([
      this.mongoDatabase.getCollection("journey_games").then((collection) =>
        collection.findOne({
          projectId,
          $or: [{ "stateV2.players.playerRefId": playerRefId }, { "stateV2.players.nickname": nickname }],
        }),
      ),
      this.mongoDatabase.getCollection("battleships_games").then((collection) =>
        collection.findOne({ projectId, $or: [{ playerRefId }, { playerName: nickname }] }),
      ),
      this.mongoDatabase.getCollection("lotto_games").then((collection) =>
        collection.findOne({ projectId, $or: [{ "players.playerRefId": playerRefId }, { "players.nickname": nickname }] }),
      ),
      this.mongoDatabase.getCollection("lotto_bingo_games").then((collection) =>
        collection.findOne({ projectId, $or: [{ "players.playerRefId": playerRefId }, { "players.nickname": nickname }] }),
      ),
      this.mongoDatabase.getCollection("quizEvents").then((collection) =>
        collection.findOne({
          projectId,
          $or: [
            { "questions.selectedAnswers.playerRefId": playerRefId },
            { "questions.selectedAnswers.playerName": nickname },
            { "questions.awards.playerName": nickname },
            { "summary.players.playerName": nickname },
          ],
        }),
      ),
    ]);
    return Boolean(journey || battleships || lotto || lottoBingo || quizEvents);
  }
}
