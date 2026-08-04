import assert from "node:assert/strict";
import test from "node:test";
import { QuizAnswerRanker } from "./QuizAnswerRanker/QuizAnswerRanker";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
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
  } as unknown as QuizEventDocument;

  const view = new QuizReadModelFactory(new QuizAnswerRanker()).create("event", event);

  assert.deepEqual(view.questions[0].chat.messages, []);
  assert.deepEqual(view.questions[0].awards, []);
  assert.deepEqual(view.questions[0].playerGroups, []);
  assert.equal(view.questions[0].ranking.length, 0);
});
