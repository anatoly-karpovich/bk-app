import assert from "node:assert/strict";
import test from "node:test";
import type { ResourceSnapshot } from "../../rewards";
import { ChatTransport } from "../../chat/domain/types";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizReadModelFactory } from "../QuizReadModelFactory";
import type { QuizChatMessageCandidate, QuizSnapshot } from "../domain/types";
import { QuizEventEngine } from "./QuizEventEngine";

const resources: ResourceSnapshot[] = [
  { id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 },
];
const templates = { defaultTemplate: { template: "Вопрос {questionNumber}: {questionText}", variables: {} }, questionOverrides: [] };
const allPool = { mode: "all" as const, rewards: [{ resourceId: "coins", amount: 10 }] };

function snapshot(questionCount = 1): QuizSnapshot {
  return {
    quizId: "quiz", configId: "config", quizName: "Quiz", quizDescription: "", resources,
    capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1,
    configRulesSnapshot: {
      configId: "config", configName: "Config", questionCount, capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1,
      defaultRegularRule: { mode: "all_accepted", rewardPool: allPool },
      regularRewardOverrides: [], bonusRules: [], messageTemplates: templates, answerMessageTemplates: templates,
    },
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: `question-${index + 1}`, questionIndex: index + 1, title: null, text: `Question ${index + 1}`,
      correctAnswer: "Answer", attachmentUrl: null, notes: null,
    })),
    effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates,
  };
}

function candidate(from: string, text: string, timestamp = "21:00"): QuizChatMessageCandidate {
  return { from, to: ["Dark"], text, timestamp, sourceLineNumber: 1, transport: ChatTransport.DIRECT, canonicalKey: `${from}:${text}:${timestamp}` };
}

function engine() {
  return new QuizEventEngine(new QuizAnswerRanker(), new QuizEventSummaryCalculator());
}

test("creates an open event with unconducted, unreviewed questions", () => {
  const event = engine().create(snapshot(2), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");

  assert.equal(event.status, "open");
  assert.equal(event.revision, 0);
  assert.deepEqual(event.questions.map((question) => [question.conductedOrder, question.reviewedAt, question.selectedAnswers]), [
    [null, null, []], [null, null, []],
  ]);
  const view = new QuizReadModelFactory(new QuizAnswerRanker()).create("event", event);
  assert.equal(view.preparedQuestionsCount, 2);
  assert.equal(view.conductedQuestionsCount, 0);
  assert.equal(view.reviewedQuestionsCount, 0);
  assert.equal(view.firstUnconductedQuestionId, event.questions[0].id);
});

test("persists one selected message per player and ranks the selected answers", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const questionId = event.questions[0].id;
  event = quizEngine.appendChatFragment(event, questionId, {
    rawText: "chat", parsedMessagesCount: 2, candidateMessagesCount: 2, duplicateMessagesCount: 0, insertedByUserId: "host",
    messages: [candidate("Alice", "later", "21:02"), candidate("Bob", "first", "21:01")],
  });
  const [alice, bob] = event.questions[0].chatMessages;
  event = quizEngine.setSelectedAnswers(event, questionId, [
    { playerName: "Alice", selectedMessageId: alice.id },
    { playerName: "Bob", selectedMessageId: bob.id },
  ]);

  assert.deepEqual(quizEngine.rankedAnswers(event.questions[0]).map((answer) => answer.playerName), ["Bob", "Alice"]);
  assert.throws(() => quizEngine.setSelectedAnswers(event, questionId, [{ playerName: "Bob", selectedMessageId: alice.id }]));
});

test("completes and reopens without inferring a question lifecycle", () => {
  const quizEngine = engine();
  const created = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const completed = quizEngine.completeEvent(created);
  const reopened = quizEngine.reopenEvent(completed);

  assert.equal(completed.status, "completed");
  assert.ok(completed.completedAt);
  assert.equal(reopened.status, "open");
  assert.equal(reopened.completedAt, null);
});

test("building a read model has no side effects on persisted event data", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const questionId = event.questions[0].id;
  event = quizEngine.appendChatFragment(event, questionId, {
    rawText: "chat", parsedMessagesCount: 1, candidateMessagesCount: 1, duplicateMessagesCount: 0, insertedByUserId: "host",
    messages: [candidate("Alice", "answer")],
  });
  const before = structuredClone(event);

  new QuizReadModelFactory(new QuizAnswerRanker()).create("event", event);

  assert.deepEqual(event, before);
});
