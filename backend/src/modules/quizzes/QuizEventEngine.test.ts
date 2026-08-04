import assert from "node:assert/strict";
import test from "node:test";
import type { ResourceSnapshot } from "../rewards";
import { RewardGrantService, type Randomizer } from "../rewards";
import { ChatTransport } from "../chat/domain/types";
import { QuizAnswerRanker } from "./QuizAnswerRanker";
import { QuizEventEngine } from "./QuizEventEngine";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import type { QuizChatMessageCandidate, QuizSnapshot } from "./domain/types";

const resources: ResourceSnapshot[] = [{ id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 }];
const allPool = (amount: number) => ({ mode: "all" as const, rewards: [{ resourceId: "coins", amount }] });
const templates = { defaultTemplate: { template: "Вопрос {questionNumber}: {questionText}", variables: {} }, questionOverrides: [] };

function snapshot(questionCount = 1): QuizSnapshot {
  return { quizId: "quiz", configId: "config", quizName: "Quiz", quizDescription: "", resources, capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1,
    configRulesSnapshot: { configId: "config", configName: "Config", questionCount, capturedAt: "2026-08-03T00:00:00.000Z", schemaVersion: 1, defaultRegularRule: { mode: "by_position", positionRewards: [{ position: 1, rewardPool: allPool(10) }, { position: 2, rewardPool: allPool(5) }] }, regularRewardOverrides: [], bonusRules: [{ id: "bonus", questionIndex: 1, position: 1, rewardPool: allPool(1) }], messageTemplates: templates, answerMessageTemplates: templates },
    questions: Array.from({ length: questionCount }, (_, index) => ({ id: `question-${index + 1}`, questionIndex: index + 1, title: null, text: `Question ${index + 1}`, correctAnswer: "Answer", attachmentUrl: null, notes: null })), effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates };
}

function candidate(from: string, text: string, timestamp = "21:00"): QuizChatMessageCandidate { return { from, to: ["Dark"], text, timestamp, sourceLineNumber: 1, transport: ChatTransport.DIRECT, canonicalKey: `${from}:${text}:${timestamp}` }; }
function engine() { const randomizer: Randomizer = { succeeds: () => true, pickWeightedIndex: () => 0 }; return new QuizEventEngine(new RewardGrantService(randomizer), new QuizAnswerRanker()); }
function activeEvent() { const quizEngine = engine(); let event = quizEngine.create(snapshot(), { userId: "host", displayName: "Host", nickname: "Dark" }, "Event"); event = quizEngine.start(event); const questionId = event.questions[0].id; return { quizEngine, event: quizEngine.startQuestion(event, questionId), questionId }; }

test("persists append-only fragments and ranks only selected accepted messages", () => {
  const { quizEngine, event: started, questionId } = activeEvent();
  const midnightStart = new Date();
  midnightStart.setHours(23, 55, 0, 0);
  started.questions[0].startedAt = midnightStart.toISOString();
  let event = quizEngine.appendChatFragment(started, questionId, { rawText: "chat", parsedMessagesCount: 3, candidateMessagesCount: 3, duplicateMessagesCount: 0, insertedByUserId: "host", messages: [candidate("Alice", "first", "23:59"), candidate("Alice", "later", "00:02"), candidate("Bob", "answer", "00:01")] });
  const question = event.questions[0];
  event = quizEngine.setPlayerAnswer(event, questionId, { playerName: "Alice", status: "accepted", selectedMessageId: question.chatMessages[1].id, decidedByUserId: "host" });
  event = quizEngine.setPlayerAnswer(event, questionId, { playerName: "Bob", status: "accepted", selectedMessageId: question.chatMessages[2].id, decidedByUserId: "host" });
  event = quizEngine.completeQuestion(event, questionId);

  assert.deepEqual(event.questions[0].awards.map((award) => [award.playerName, award.resolvedRewards[0].amount]), [["Bob", 10], ["Bob", 1], ["Alice", 5]]);
  assert.equal(event.questions[0].chatFragments[0].addedMessagesCount, 3);
  assert.equal(event.questions[0].chatMessages[0].firstSeenOrder, 1);
  assert.deepEqual(new QuizReadModelFactory(quizEngine).create("event", event).questions[0].ranking.map((answer) => answer.playerName), ["Bob", "Alice"]);
});

test("recalculates a completed question after a late decision and clears selected messages for rejected players", () => {
  const { quizEngine, event: started, questionId } = activeEvent();
  let event = quizEngine.appendChatFragment(started, questionId, { rawText: "chat", parsedMessagesCount: 1, candidateMessagesCount: 1, duplicateMessagesCount: 0, insertedByUserId: "host", messages: [candidate("Alice", "answer")] });
  const messageId = event.questions[0].chatMessages[0].id;
  event = quizEngine.setPlayerAnswer(event, questionId, { playerName: "Alice", status: "accepted", selectedMessageId: messageId, decidedByUserId: "host" });
  event = quizEngine.completeQuestion(event, questionId);
  event = quizEngine.setPlayerAnswer(event, questionId, { playerName: "Alice", status: "rejected", selectedMessageId: null, decidedByUserId: "host" });

  assert.equal(event.questions[0].awards.length, 0);
  assert.deepEqual(event.questions[0].playerAnswers[0], { playerName: "Alice", status: "rejected", selectedMessageId: null, decidedAt: event.questions[0].playerAnswers[0].decidedAt, decidedByUserId: "host" });
});
