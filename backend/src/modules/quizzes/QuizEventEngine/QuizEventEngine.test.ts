import assert from "node:assert/strict";
import test from "node:test";
import type { ResourceSnapshot } from "../../rewards";
import { ChatTransport } from "../../chat/domain/types";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
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

function chatInput(messages: QuizChatMessageCandidate[]) {
  return {
    rawText: "chat",
    parsedMessagesCount: messages.length,
    candidateMessagesCount: messages.length,
    duplicateMessagesCount: 0,
    messages,
    insertedByUserId: "host",
  };
}

function engine() {
  return new QuizEventEngine(
    new QuizAnswerRanker(),
    new QuizAwardCalculator(),
    new QuizEventSummaryCalculator(),
    new QuizSelectedAnswerPruner(),
  );
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

test("assigns continuous conducted order in the host's review order", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(3), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const [first, second, third] = event.questions;

  event = quizEngine.reviewQuestion(event, first.id, "host");
  event = quizEngine.reviewQuestion(event, third.id, "host");
  event = quizEngine.reviewQuestion(event, second.id, "host");

  assert.deepEqual(event.questions.map((question) => question.conductedOrder), [1, 3, 2]);
  assert.equal(event.summary?.totalConductedQuestions, 3);
  assert.equal(event.summary?.totalReviewedQuestions, 3);
});

test("an effective selection change clears review and awards without changing conducted order", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(3), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const [first, , third] = event.questions;
  event = quizEngine.reviewQuestion(event, first.id, "host");
  event = quizEngine.appendChatFragment(event, third.id, {
    rawText: "chat", parsedMessagesCount: 1, candidateMessagesCount: 1, duplicateMessagesCount: 0, insertedByUserId: "host",
    messages: [candidate("Alice", "answer")],
  });
  const answerId = event.questions[2].chatMessages[0].id;
  event = quizEngine.setSelectedAnswers(event, third.id, [{ playerName: "Alice", selectedMessageId: answerId }]);
  event = quizEngine.reviewQuestion(event, third.id, "host");

  assert.equal(event.questions[2].conductedOrder, 2);
  assert.equal(event.questions[2].awards.length, 1);
  const awardId = event.questions[2].awards[0].id;

  event.questions[2].awards = [];
  event = quizEngine.reviewQuestion(event, third.id, "host");
  assert.equal(event.questions[2].conductedOrder, 2);
  assert.equal(event.questions[2].awards[0].id, awardId);

  event = quizEngine.setSelectedAnswers(event, third.id, []);

  assert.equal(event.questions[2].conductedOrder, 2);
  assert.equal(event.questions[2].reviewedAt, null);
  assert.deepEqual(event.questions[2].awards, []);
  assert.equal(event.summary?.totalReviewedQuestions, 1);

  event = quizEngine.reviewQuestion(event, third.id, "host");
  assert.equal(event.questions[2].conductedOrder, 2);
  assert.ok(event.questions[2].reviewedAt);
  assert.deepEqual(event.questions[2].awards, []);
  assert.equal(event.summary?.totalReviewedQuestions, 2);
});

test("marking a question not conducted compacts order and recalculates affected bonus awards", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(3), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  event.quizSnapshot.configRulesSnapshot.bonusRules = [{
    id: "second-slot", questionIndex: 2, position: 1, rewardPool: allPool,
  }];

  for (const question of event.questions) {
    event = quizEngine.appendChatFragment(event, question.id, {
      rawText: "chat", parsedMessagesCount: 1, candidateMessagesCount: 1, duplicateMessagesCount: 0, insertedByUserId: "host",
      messages: [candidate(`Player ${question.questionIndex}`, "answer")],
    });
    const messageId = event.questions.find((item) => item.id === question.id)!.chatMessages[0].id;
    event = quizEngine.setSelectedAnswers(event, question.id, [{ playerName: `Player ${question.questionIndex}`, selectedMessageId: messageId }]);
    event = quizEngine.reviewQuestion(event, question.id, "host");
  }

  assert.equal(event.questions[1].awards.some((award) => award.source.kind === "bonus_position"), true);
  assert.equal(event.questions[2].awards.some((award) => award.source.kind === "bonus_position"), false);

  event = quizEngine.markAsNotConducted(event, event.questions[0].id);

  assert.deepEqual(event.questions.map((question) => question.conductedOrder), [null, 1, 2]);
  assert.equal(event.questions[0].reviewedAt, null);
  assert.deepEqual(event.questions[0].awards, []);
  assert.equal(event.questions[1].reviewedAt !== null, true);
  assert.equal(event.questions[1].awards.some((award) => award.source.kind === "bonus_position"), false);
  assert.equal(event.questions[2].awards.some((award) => award.source.kind === "bonus_position"), true);
  assert.equal(event.summary?.totalReviewedQuestions, 2);
});

test("replace retains canonical message IDs, prunes dangling selections, and resets the reviewed result", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const questionId = event.questions[0].id;
  const alice = candidate("Alice", "old", "21:02");
  const bob = candidate("Bob", "removed", "21:01");
  event = quizEngine.appendChat(event, questionId, chatInput([alice, bob]));
  const [aliceMessage, bobMessage] = event.questions[0].chatMessages;
  event = quizEngine.setSelectedAnswers(event, questionId, [
    { playerName: "Alice", selectedMessageId: aliceMessage.id },
    { playerName: "Bob", selectedMessageId: bobMessage.id },
  ]);
  event = quizEngine.reviewQuestion(event, questionId, "host");
  const conductedOrder = event.questions[0].conductedOrder;

  event = quizEngine.replaceChat(event, questionId, chatInput([
    alice,
    candidate("Cara", "new", "21:00"),
  ]));

  const question = event.questions[0];
  assert.deepEqual(question.chatMessages.map((message) => [message.from, message.id, message.effectiveOrder]), [
    ["Alice", aliceMessage.id, 1],
    ["Cara", question.chatMessages[1].id, 2],
  ]);
  assert.deepEqual(question.selectedAnswers, [{ playerName: "Alice", selectedMessageId: aliceMessage.id }]);
  assert.equal(question.conductedOrder, conductedOrder);
  assert.equal(question.reviewedAt, null);
  assert.deepEqual(question.awards, []);
  assert.equal(question.chatFragments.at(-1)?.removedPersistedSelectionsCount, 1);
  assert.equal(question.chatFragments.at(-1)?.effectiveChange, true);
});

test("a no-op replace preserves review and awards while recording the attempt", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const questionId = event.questions[0].id;
  const alice = candidate("Alice", "answer");
  event = quizEngine.appendChat(event, questionId, chatInput([alice]));
  const messageId = event.questions[0].chatMessages[0].id;
  event = quizEngine.setSelectedAnswers(event, questionId, [{ playerName: "Alice", selectedMessageId: messageId }]);
  event = quizEngine.reviewQuestion(event, questionId, "host");
  const reviewedAt = event.questions[0].reviewedAt;
  const awards = structuredClone(event.questions[0].awards);

  event = quizEngine.replaceChat(event, questionId, chatInput([alice]));

  assert.equal(event.questions[0].reviewedAt, reviewedAt);
  assert.deepEqual(event.questions[0].awards, awards);
  assert.equal(event.questions[0].chatFragments.at(-1)?.effectiveChange, false);
});

test("clear removes the effective chat and selections without changing conducted order", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  const questionId = event.questions[0].id;
  event = quizEngine.appendChat(event, questionId, chatInput([candidate("Alice", "answer")]));
  const messageId = event.questions[0].chatMessages[0].id;
  event = quizEngine.setSelectedAnswers(event, questionId, [{ playerName: "Alice", selectedMessageId: messageId }]);
  event = quizEngine.reviewQuestion(event, questionId, "host");
  const conductedOrder = event.questions[0].conductedOrder;

  event = quizEngine.clearChat(event, questionId);

  assert.equal(event.questions[0].conductedOrder, conductedOrder);
  assert.deepEqual(event.questions[0].chatMessages, []);
  assert.deepEqual(event.questions[0].selectedAnswers, []);
  assert.equal(event.questions[0].reviewedAt, null);
  assert.deepEqual(event.questions[0].awards, []);
});

test("completes and reopens with unreviewed and unused questions without recalculating awards", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(3), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event");
  event = quizEngine.reviewQuestion(event, event.questions[0].id, "host");
  event = quizEngine.reviewQuestion(event, event.questions[1].id, "host");
  event = quizEngine.unreviewQuestion(event, event.questions[1].id);

  const completed = quizEngine.completeEvent(event);
  const summaryBeforeReopen = structuredClone(completed.summary);
  const reopened = quizEngine.reopenEvent(completed);

  assert.equal(completed.status, "completed");
  assert.ok(completed.completedAt);
  assert.equal(completed.summary?.totalPreparedQuestions, 3);
  assert.equal(completed.summary?.totalConductedQuestions, 2);
  assert.equal(completed.summary?.totalReviewedQuestions, 1);
  assert.equal(reopened.status, "open");
  assert.equal(reopened.completedAt, null);
  assert.deepEqual(reopened.summary, summaryBeforeReopen);
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
