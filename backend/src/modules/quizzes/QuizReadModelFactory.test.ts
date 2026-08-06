import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { QuizAnswerRanker } from "./QuizAnswerRanker/QuizAnswerRanker";
import { QuizEventReadModelFactory } from "./QuizEventReadModelFactory";
import type { QuizEventDocument } from "./domain/types";

test("projects historical event questions without chat workspace fields", () => {
  const event = {
    projectId: "project",
    quizId: "quiz",
    name: "Quiz",
    hostUserId: "host",
    hostSnapshot: { userId: "host", displayName: "Host", nickname: "Host" },
    status: "completed",
    revision: 0,
    summary: null,
    completedAt: "2026-08-04T10:00:00.000Z",
    createdAt: "2026-08-04T09:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    schemaVersion: 3,
    quizSnapshot: {
      quizId: "quiz",
      configId: "config",
      quizName: "Quiz",
      quizDescription: "",
      resources: [],
      questions: [{ id: "source-question", questionIndex: 1, title: null, text: "Question", correctAnswer: null, attachmentUrl: null, notes: null }],
      effectiveMessageTemplates: { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] },
      effectiveAnswerMessageTemplates: { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] },
      configRulesSnapshot: { configId: "config", configName: "Config", questionCount: 1, defaultRegularRule: { mode: "all_accepted", rewardPool: { mode: "all", rewards: [] } }, regularRewardOverrides: [], bonusRules: [], messageTemplates: { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] }, answerMessageTemplates: { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] }, capturedAt: "now", schemaVersion: 1 },
      capturedAt: "now",
      schemaVersion: 1,
    },
    questions: [{ id: "event-question", quizQuestionId: "source-question", questionIndex: 1, conductedOrder: null, reviewedAt: null, reviewedByUserId: null, selectedAnswers: [{ playerName: "Alice", selectedMessageId: "missing-message" }], updatedAt: "now" }],
    _id: new ObjectId(),
  } as unknown as QuizEventDocument;

  const view = new QuizEventReadModelFactory(new QuizAnswerRanker()).create("event", event);

  assert.deepEqual(view.state.questions[0].chat.playerGroups, []);
  assert.deepEqual(view.state.questions[0].result.awards, []);
  assert.equal(view.state.questions[0].result.ranking.length, 0);
  assert.equal("_id" in view, false);
  assert.doesNotMatch(JSON.stringify(view), /buffer/);
  assert.doesNotMatch(JSON.stringify(view), /quizQuestionId|selectedAnswers|canonicalKey/);
});
