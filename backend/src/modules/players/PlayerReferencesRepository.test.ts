import assert from "node:assert/strict";
import test from "node:test";
import { PlayerReferencesRepository } from "./PlayerReferencesRepository";

test("checks every saved-game source by playerRefId without nickname fallback", async () => {
  const queries: Array<{ collection: string; filter: Record<string, unknown> }> = [];
  const repository = new PlayerReferencesRepository({
    async getCollection(collection: string) {
      return {
        async findOne(filter: Record<string, unknown>) {
          queries.push({ collection, filter });
          return null;
        },
      };
    },
  } as never);

  assert.equal(await repository.hasSavedGameReference("project", "player-ref"), false);
  assert.deepEqual(queries.map((query) => query.collection).sort(), [
    "activity_results",
    "battleships_games",
    "journey_games",
    "lotto_bingo_games",
    "lotto_games",
    "quizEvents",
  ]);
  assert.deepEqual(queries.find((query) => query.collection === "journey_games")?.filter, {
    projectId: "project",
    "stateV2.players.playerRefId": "player-ref",
  });
  assert.deepEqual(queries.find((query) => query.collection === "battleships_games")?.filter, {
    projectId: "project",
    playerRefId: "player-ref",
  });
  assert.deepEqual(queries.find((query) => query.collection === "lotto_games")?.filter, {
    projectId: "project",
    "players.playerRefId": "player-ref",
  });
  assert.deepEqual(queries.find((query) => query.collection === "lotto_bingo_games")?.filter, {
    projectId: "project",
    "players.playerRefId": "player-ref",
  });
  assert.deepEqual(queries.find((query) => query.collection === "activity_results")?.filter, {
    projectId: "project",
    "participants.playerRefId": "player-ref",
  });
  assert.deepEqual(queries.find((query) => query.collection === "quizEvents")?.filter, {
    projectId: "project",
    $or: [
      { "questions.selectedAnswers.playerRefId": "player-ref" },
      { "questions.awards.playerRefId": "player-ref" },
      { "summary.players.playerRefId": "player-ref" },
    ],
  });
});
