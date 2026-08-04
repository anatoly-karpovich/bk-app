import assert from "node:assert/strict";
import test from "node:test";
import type { QuizEventQuestion, QuizSnapshot } from "../domain/types";
import { QuizAwardCalculator } from "./QuizAwardCalculator";

const pool = (amount: number) => ({ mode: "all" as const, rewards: [{ resourceId: "coins", amount }] });
const templates = { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] };

const snapshot: QuizSnapshot = {
  quizId: "quiz", configId: "config", quizName: "Quiz", quizDescription: "", capturedAt: "now", schemaVersion: 1,
  resources: [{ id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 }],
  configRulesSnapshot: {
    configId: "config", configName: "Config", questionCount: 2, capturedAt: "now", schemaVersion: 1,
    defaultRegularRule: { mode: "all_accepted", rewardPool: pool(1) },
    regularRewardOverrides: [{ questionIndex: 2, rule: { mode: "by_position", positionRewards: [{ position: 1, rewardPool: pool(10) }] } }],
    bonusRules: [{ id: "first-conducted", questionIndex: 1, position: 1, rewardPool: pool(3) }],
    messageTemplates: templates, answerMessageTemplates: templates,
  },
  questions: [], effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates,
};

const question: QuizEventQuestion = {
  id: "event-question", quizQuestionId: "source-question-2", questionIndex: 2, conductedOrder: 1,
  reviewedAt: "2026-08-04T12:00:00.000Z", reviewedByUserId: "host",
  message: {
    messageTextOverride: null, messageTextUpdatedAt: null, messageTextUpdatedByUserId: null,
    answerTextOverride: null, answerTextUpdatedAt: null, answerTextUpdatedByUserId: null,
  },
  chat: { rawText: "", messages: [], updatedAt: null, updatedByUserId: null },
  selectedAnswers: [{ playerName: "Alice", selectedMessageId: "message-1" }],
  awards: [],
  updatedAt: "2026-08-04T12:00:00.000Z",
};

test("uses source questionIndex for regular rules and conductedOrder for bonus slots", () => {
  const calculator = new QuizAwardCalculator();
  const ranking = [{ playerName: "Alice", selectedMessageId: "message-1", timestamp: "21:00", effectiveOrder: 1, position: 1 }];

  const awards = calculator.calculate(snapshot, question, ranking, "2026-08-04T12:01:00.000Z");

  assert.deepEqual(awards.map((award) => [award.source.kind, award.rewards[0].amount]), [
    ["regular_position", 10],
    ["bonus_position", 3],
  ]);
  assert.equal(awards[0].source.questionIndex, 2);
  assert.equal(awards[0].source.conductedOrder, 1);
  assert.equal(awards[1].source.questionIndex, 2);
  assert.equal(awards[1].source.conductedOrder, 1);
});

test("returns the same awards for the same reviewed result", () => {
  const calculator = new QuizAwardCalculator();
  const ranking = [{ playerName: "Alice", selectedMessageId: "message-1", timestamp: "21:00", effectiveOrder: 1, position: 1 }];

  assert.deepEqual(
    calculator.calculate(snapshot, question, ranking, "2026-08-04T12:01:00.000Z"),
    calculator.calculate(snapshot, question, ranking, "2026-08-04T12:01:00.000Z"),
  );
});
