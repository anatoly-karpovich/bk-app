import assert from "node:assert/strict";
import test from "node:test";
import { PLAYER_REFERENCE_AUDIT_SOURCES, type PlayerReferenceCollection } from "./PlayerReferenceAudit";

function source(collection: PlayerReferenceCollection) {
  const result = PLAYER_REFERENCE_AUDIT_SOURCES.find((candidate) => candidate.collection === collection);
  assert.ok(result, `Missing audit source for ${collection}`);
  return result;
}

test("audits every persisted player-reference location without nickname resolution", () => {
  const journey = source("journey_games");
  const battleships = source("battleships_games");
  const lotto = source("lotto_games");
  const lottoBingo = source("lotto_bingo_games");
  const quizEvent = source("quizEvents");

  const references = [
    ...journey.extractReferences({
      _id: "journey-1",
      projectId: "project-1",
      stateV2: { players: [{ id: "journey-linked", nickname: "Linked", playerRefId: "player-1" }] },
    }),
    ...battleships.extractReferences({ _id: "battleships-1", projectId: "project-1", playerName: "No ref" }),
    ...lotto.extractReferences({
      _id: "lotto-1",
      projectId: "project-1",
      players: [{ id: "lotto-linked", nickname: "Linked Lotto", playerRefId: "player-2" }],
    }),
    ...lottoBingo.extractReferences({ _id: "bingo-1", projectId: "project-1", players: [] }),
    ...quizEvent.extractReferences({
      _id: "quiz-event-1",
      projectId: "project-1",
      questions: [
        {
          selectedAnswers: [{ selectedMessageId: "message-1", playerName: "No selected ref" }],
          awards: [{ id: "award-1", playerName: "Linked award", playerRefId: "player-3" }],
        },
      ],
      summary: { players: [{ playerName: "No summary ref" }] },
    }),
  ];
  const missing = [
    ...journey.extractMissingReferences({
      _id: "journey-1",
      projectId: "project-1",
      stateV2: {
        players: [
          { id: "journey-linked", nickname: "Linked", playerRefId: "player-1" },
          { id: "journey-missing", nickname: "No Journey ref" },
        ],
      },
    }),
    ...battleships.extractMissingReferences({ _id: "battleships-1", projectId: "project-1", playerName: "No ref" }),
    ...lotto.extractMissingReferences({
      _id: "lotto-1",
      projectId: "project-1",
      players: [{ id: "lotto-linked", nickname: "Linked Lotto", playerRefId: "player-2" }],
    }),
    ...lottoBingo.extractMissingReferences({
      _id: "bingo-1",
      projectId: "project-1",
      players: [{ id: "bingo-missing", nickname: "No Bingo ref" }],
    }),
    ...quizEvent.extractMissingReferences({
      _id: "quiz-event-1",
      projectId: "project-1",
      questions: [
        {
          selectedAnswers: [{ selectedMessageId: "message-1", playerName: "No selected ref" }],
          awards: [{ id: "award-1", playerName: "Linked award", playerRefId: "player-3" }],
        },
      ],
      summary: { players: [{ playerName: "No summary ref" }] },
    }),
  ];

  assert.deepEqual(references.map((reference) => reference.playerRefId), ["player-1", "player-2", "player-3"]);
  assert.deepEqual(
    missing.map((reference) => [reference.collection, reference.participantId, reference.field]),
    [
      ["journey_games", "journey-missing", "playerRefId"],
      ["battleships_games", "game-player", "playerRefId"],
      ["lotto_bingo_games", "bingo-missing", "playerRefId"],
      ["quizEvents", "message-1", "playerRefId"],
      ["quizEvents", "summary:no summary ref", "playerRefId"],
    ],
  );
});
