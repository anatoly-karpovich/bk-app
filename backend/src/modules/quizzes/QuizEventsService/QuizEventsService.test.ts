import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../../auth/domain/types";
import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatParser } from "../../chat/ChatParser";
import { ChatMessageDeduplicator } from "../ChatMessageDeduplicator/ChatMessageDeduplicator";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventEngine } from "../QuizEventEngine/QuizEventEngine";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizReadModelFactory } from "../QuizReadModelFactory";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
import type { QuizEventDocument, QuizSnapshot } from "../domain/types";
import { QuizEventsService } from "./QuizEventsService";

const templates = { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] };
const snapshot: QuizSnapshot = { quizId: "quiz", configId: "config", quizName: "Quiz", quizDescription: "", capturedAt: "now", schemaVersion: 1, resources: [{ id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 }], configRulesSnapshot: { configId: "config", configName: "Config", questionCount: 1, capturedAt: "now", schemaVersion: 1, defaultRegularRule: { mode: "all_accepted", rewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 1 }] } }, regularRewardOverrides: [], bonusRules: [], messageTemplates: templates, answerMessageTemplates: templates }, questions: [{ id: "source", questionIndex: 1, title: null, text: "Question", correctAnswer: null, attachmentUrl: null, notes: null }], effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates };
const actor: CurrentUser = { id: "host", login: "host", displayName: "Host", role: "host", projectProfiles: [{ projectId: "project", nickname: "Dark" }] };

function setup() {
  const ranker = new QuizAnswerRanker(); const engine = new QuizEventEngine(ranker, new QuizAwardCalculator(), new QuizEventSummaryCalculator(), new QuizSelectedAnswerPruner()); let event = engine.create(snapshot, { userId: "host", displayName: "Host", nickname: "Dark" }, "Event"); event.projectId = "project"; const documentId = new ObjectId();
  const repository = { findByIdAndProjectId: async () => ({ ...event, _id: documentId }), update: async (_id: string, _project: string, revision: number, next: QuizEventDocument) => { if (event.revision !== revision) return null; event = { ...next, revision: revision + 1 }; return { ...event, _id: documentId }; } };
  const identity = new ChatMessageIdentity(); const service = new QuizEventsService(repository as never, {} as never, {} as never, engine, new ChatParser(), new QuizMessageCandidateFilter(identity), new ChatMessageDeduplicator(identity), new QuizReadModelFactory(ranker));
  return { service, questionId: event.questions[0].id };
}

test("saves a complete chat, preserves ids on equivalent saves, and saves the final result", async () => {
  const { service, questionId } = setup(); const raw = "21:00 [Alice] private [Dark] Минск";
  const first = await service.saveQuestionChat(actor, "project", "event", questionId, raw, 0);
  assert.equal(first.event.questions[0].conductedOrder, 1); assert.equal(first.mutation.effectiveChange, true);
  const repeat = await service.saveQuestionChat(actor, "project", "event", questionId, raw, first.event.revision);
  assert.equal(repeat.mutation.effectiveChange, false);
  const messageId = repeat.event.questions[0].playerGroups[0].messages[0].id;
  const result = await service.saveQuestionResult(actor, "project", "event", questionId, [{ playerName: "Alice", selectedMessageId: messageId }], repeat.event.revision);
  assert.ok(result.result.reviewedAt); assert.equal(result.event.questions[0].awards.length, 1);
});

test("rejects non-empty chat without candidates and accepts an explicit empty clear", async () => {
  const { service, questionId } = setup();
  await assert.rejects(() => service.saveQuestionChat(actor, "project", "event", questionId, "not chat", 0));
  const saved = await service.saveQuestionChat(actor, "project", "event", questionId, "", 0);
  assert.equal(saved.event.questions[0].chat.rawText, "");
});
