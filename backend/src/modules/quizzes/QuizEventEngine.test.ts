import assert from "node:assert/strict";
import test from "node:test";
import type { ResourceSnapshot } from "../rewards";
import { RewardGrantService, type Randomizer } from "../rewards";
import { QuizEventEngine } from "./QuizEventEngine";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import type { QuizSnapshot } from "./domain/types";

const resources: ResourceSnapshot[] = [{ id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 }];
const allPool = (amount: number) => ({ mode: "all" as const, rewards: [{ resourceId: "coins", amount }] });
const templates = { defaultTemplate: { template: "Вопрос {questionNumber}: {questionText}", variables: {} }, questionOverrides: [] };

function snapshot(questionCount = 1): QuizSnapshot {
  return {
    quizId: "quiz", configId: "config", quizName: "Quiz", quizDescription: "", resources, capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1,
    configRulesSnapshot: {
      configId: "config", configName: "Config", questionCount, capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1,
      defaultRegularRule: { mode: "by_position", positionRewards: [{ position: 1, rewardPool: allPool(10) }, { position: 2, rewardPool: allPool(5) }] },
      regularRewardOverrides: [], bonusRules: [{ id: "bonus", questionIndex: 1, position: 1, rewardPool: allPool(1) }], messageTemplates: templates, answerMessageTemplates: templates,
    },
    questions: Array.from({ length: questionCount }, (_, index) => ({ id: `question-${index + 1}`, questionIndex: index + 1, title: null, text: `Question ${index + 1}`, correctAnswer: "Answer", attachmentUrl: null, notes: null })),
    effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates,
  };
}

function parsed(playerName: string, rawMessage: string) {
  return { sourceLineNumber: 1, playerName, rawMessage, transport: "direct" as const, canonicalKey: `${playerName}:${rawMessage}` };
}

function engine() {
  const randomizer: Randomizer = { succeeds: () => true, pickWeightedIndex: () => 0 };
  return new QuizEventEngine(new RewardGrantService(randomizer));
}

test("calculates regular and bonus awards once per exact player and recalculates a completed question", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  event = quizEngine.start(event);
  const questionId = event.questions[0].id;
  event = quizEngine.startQuestion(event, questionId);
  event = quizEngine.appendAnswers(event, questionId, { mode: "append", rawText: "", insertedByUserId: "host", parsed: [parsed("Alice", "one"), parsed("Alice", "again"), parsed("alice", "two")] });
  event = quizEngine.changeAnswerStatus(event, questionId, event.questions[0].answers.map((answer) => answer.id), "accepted", "host");
  event = quizEngine.completeQuestion(event, questionId);

  assert.deepEqual(event.questions[0].awards.map((award) => [award.playerName, award.resolvedRewards[0].amount, award.source.kind]), [
    ["Alice", 10, "regular_position"], ["Alice", 1, "bonus_position"], ["alice", 5, "regular_position"],
  ]);
  assert.equal(event.summary?.totalUniqueCorrectAnswers, 2);

  const lateAnswerId = event.questions[0].answers[2].id;
  event = quizEngine.changeAnswerStatus(event, questionId, [lateAnswerId], "rejected", "host");
  assert.deepEqual(event.questions[0].awards.map((award) => [award.playerName, award.resolvedRewards[0].amount]), [["Alice", 10], ["Alice", 1]]);
  assert.equal(event.questions[0].status, "completed");
});

test("opens the next pending question after completion and preserves completed indexes", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(3), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  event = quizEngine.start(event);
  const secondId = event.questions[1].id;
  event = quizEngine.startQuestion(event, secondId);
  event = quizEngine.completeQuestion(event, secondId);
  const firstId = event.questions.find((question) => question.quizQuestionId === "question-1")!.id;
  const completed = event.questions.find((question) => question.id === secondId)!;
  assert.equal(completed.questionIndex, 1);
  assert.equal(event.currentQuestionId, firstId);
  assert.equal(event.questions.find((question) => question.id === firstId)?.status, "active");
  const view = new QuizReadModelFactory(quizEngine).create("event", event);
  assert.equal(view.questions.find((question) => question.id === firstId)?.questionText, "Question 1");
});

test("replaces active answers with exactly the host-confirmed preview candidates", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  event = quizEngine.start(event);
  const questionId = event.questions[0].id;
  event = quizEngine.startQuestion(event, questionId);
  event = quizEngine.appendAnswers(event, questionId, { mode: "append", rawText: "old", insertedByUserId: "host", parsed: [parsed("Old", "old answer")] });
  event = quizEngine.appendAnswers(event, questionId, {
    mode: "replace",
    rawText: "replacement",
    insertedByUserId: "host",
    parsed: [parsed("Alice", "correct"), parsed("Bob", "wrong")],
    acceptedCanonicalKeys: ["Alice:correct"],
  });

  assert.deepEqual(event.questions[0].answers.filter((answer) => answer.isActive).map((answer) => [answer.playerName, answer.rawMessage, answer.status]), [["Alice", "correct", "accepted"]]);
  assert.equal(event.questions[0].chatFragments.filter((fragment) => fragment.isActive).length, 1);
  assert.equal(event.questions[0].chatFragments.filter((fragment) => fragment.isActive)[0].rawText, "replacement");

  event = quizEngine.appendAnswers(event, questionId, {
    mode: "replace",
    rawText: "replacement again",
    insertedByUserId: "host",
    parsed: [parsed("Alice", "correct")],
    acceptedCanonicalKeys: ["Alice:correct"],
  });
  assert.deepEqual(event.questions[0].answers.filter((answer) => answer.isActive).map((answer) => answer.playerName), ["Alice"]);
});
