import assert from "node:assert/strict";
import test from "node:test";
import { ChatTransport } from "../../chat/domain/types";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
import type { QuizChatMessageCandidate, QuizSnapshot } from "../domain/types";
import { QuizEventEngine } from "./QuizEventEngine";

const templates = { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] };
const pool = { mode: "all" as const, rewards: [{ resourceId: "coins", amount: 10 }] };
const resources = [
  {
    id: "coins",
    code: "coins",
    name: "Coins",
    label: "монет",
    type: "currency" as const,
    valueType: "integer" as const,
    precision: 0,
  },
];
const candidate = (from: string, text: string, timestamp = "21:00"): QuizChatMessageCandidate => ({
  from,
  to: ["Host"],
  text,
  timestamp,
  sourceLineNumber: 1,
  transport: ChatTransport.PRIVATE,
  canonicalKey: `${from}:${text}:${timestamp}`,
});

function snapshot(count = 1): QuizSnapshot {
  return {
    quizId: "quiz",
    configId: "config",
    quizName: "Quiz",
    quizDescription: "",
    resources,
    capturedAt: "now",
    schemaVersion: 1,
    configRulesSnapshot: {
      configId: "config",
      configName: "Config",
      questionCount: count,
      capturedAt: "now",
      schemaVersion: 1,
      defaultRegularRule: { mode: "all_accepted", rewardPool: pool },
      regularRewardOverrides: [],
      bonusRules: [],
      messageTemplates: templates,
      answerMessageTemplates: templates,
    },
    questions: Array.from({ length: count }, (_, index) => ({
      id: `source-${index}`,
      questionIndex: index + 1,
      title: null,
      text: `Question ${index + 1}`,
      correctAnswer: null,
      attachmentUrl: null,
      notes: null,
    })),
    effectiveMessageTemplates: templates,
    effectiveAnswerMessageTemplates: templates,
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
function saveChat(
  quizEngine: QuizEventEngine,
  event: ReturnType<QuizEventEngine["create"]>,
  questionId: string,
  messages: QuizChatMessageCandidate[],
) {
  return quizEngine.saveQuestionChat(event, questionId, { rawText: "chat", messages, actorId: "host" });
}

test("saving non-empty chat conducts a question and saving its result finalizes awards", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Host" }, "Event");
  const questionId = event.questions[0].id;
  event = saveChat(quizEngine, event, questionId, [candidate("Alice", "answer")]);
  const messageId = event.questions[0].chat.messages[0].id;
  assert.equal(event.questions[0].conductedOrder, 1);
  event = quizEngine.saveQuestionResult(
    event,
    questionId,
    [{ playerName: "Alice", selectedMessageId: messageId }],
    "host",
  );
  assert.ok(event.questions[0].reviewedAt);
  assert.equal(event.questions[0].awards.length, 1);
});

test("chat reordering clears a saved result while retaining conducted order", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Host" }, "Event");
  const questionId = event.questions[0].id;
  event = saveChat(quizEngine, event, questionId, [candidate("Alice", "one"), candidate("Bob", "two")]);
  event = quizEngine.saveQuestionResult(
    event,
    questionId,
    [{ playerName: "Alice", selectedMessageId: event.questions[0].chat.messages[0].id }],
    "host",
  );
  event = saveChat(quizEngine, event, questionId, [candidate("Bob", "two"), candidate("Alice", "one")]);
  assert.equal(event.questions[0].conductedOrder, 1);
  assert.equal(event.questions[0].reviewedAt, null);
  assert.deepEqual(event.questions[0].awards, []);
});

test("marking a reviewed question unreviewed retains its chat and conducted order", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Host" }, "Event");
  const questionId = event.questions[0].id;
  event = saveChat(quizEngine, event, questionId, [candidate("Alice", "answer")]);
  const messageId = event.questions[0].chat.messages[0].id;
  event = quizEngine.saveQuestionResult(
    event,
    questionId,
    [{ playerName: "Alice", selectedMessageId: messageId }],
    "host",
  );
  event = quizEngine.markAsUnreviewed(event, questionId);
  assert.equal(event.questions[0].conductedOrder, 1);
  assert.equal(event.questions[0].reviewedAt, null);
  assert.equal(event.questions[0].chat.messages.length, 1);
  assert.equal(event.questions[0].selectedAnswers[0]?.selectedMessageId, messageId);
  assert.deepEqual(event.questions[0].awards, []);
});

test("marking a question not conducted allows the same saved chat to conduct it again", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Host" }, "Event");
  const questionId = event.questions[0].id;
  event = saveChat(quizEngine, event, questionId, [candidate("Alice", "answer")]);
  event = quizEngine.markAsNotConducted(event, questionId);
  assert.equal(event.questions[0].conductedOrder, null);
  event = saveChat(quizEngine, event, questionId, [candidate("Alice", "answer")]);
  assert.equal(event.questions[0].conductedOrder, 1);
});

test("completion requires at least one conducted question and a saved result for each", () => {
  const quizEngine = engine();
  let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Host" }, "Event");
  assert.throws(() => quizEngine.completeEvent(event));
  event = saveChat(quizEngine, event, event.questions[0].id, [candidate("Alice", "answer")]);
  assert.throws(() => quizEngine.completeEvent(event));
  event = quizEngine.saveQuestionResult(event, event.questions[0].id, [], "host");
  assert.equal(quizEngine.completeEvent(event).status, "completed");
});
