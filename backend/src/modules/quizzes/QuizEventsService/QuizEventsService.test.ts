import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatParser } from "../../chat/ChatParser";
import type { CurrentUser } from "../../auth/domain/types";
import { ChatMessageDeduplicator } from "../ChatMessageDeduplicator/ChatMessageDeduplicator";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
import { QuizEventsService } from "./QuizEventsService";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizReadModelFactory } from "../QuizReadModelFactory";
import type { QuizEventDocument, QuizSnapshot } from "../domain/types";
import { QuizEventEngine } from "../QuizEventEngine/QuizEventEngine";

const templates = { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] };
const snapshot: QuizSnapshot = {
  quizId: "quiz",
  configId: "config",
  quizName: "Quiz",
  quizDescription: "",
  capturedAt: "now",
  schemaVersion: 1,
  resources: [
    { id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 },
  ],
  configRulesSnapshot: {
    configId: "config",
    configName: "Config",
    questionCount: 1,
    capturedAt: "now",
    schemaVersion: 1,
    defaultRegularRule: {
      mode: "all_accepted",
      rewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 1 }] },
    },
    regularRewardOverrides: [],
    bonusRules: [],
    messageTemplates: templates,
    answerMessageTemplates: templates,
  },
  questions: [
    {
      id: "source-question",
      questionIndex: 1,
      title: null,
      text: "Question",
      correctAnswer: null,
      attachmentUrl: null,
      notes: null,
    },
  ],
  effectiveMessageTemplates: templates,
  effectiveAnswerMessageTemplates: templates,
};
const actor: CurrentUser = {
  id: "host",
  login: "host",
  displayName: "Host",
  role: "host",
  projectProfiles: [{ projectId: "project", nickname: "Dark" }],
};

function setup(): { service: QuizEventsService; event: QuizEventDocument; questionId: string; updatesCount: () => number } {
  const answerRanker = new QuizAnswerRanker();
  const engine = new QuizEventEngine(
    answerRanker,
    new QuizAwardCalculator(),
    new QuizEventSummaryCalculator(),
    new QuizSelectedAnswerPruner(),
  );
  let event = engine.create(snapshot, { userId: actor.id, displayName: actor.displayName, nickname: "Dark" }, "Event");
  event.projectId = "project";
  const questionId = event.questions[0].id;
  const documentId = new ObjectId();
  let updates = 0;
  const repository = {
    findByIdAndProjectId: async () => ({ ...event, _id: documentId }),
    update: async (_id: string, _projectId: string, expectedRevision: number, next: QuizEventDocument) => {
      if (event.revision !== expectedRevision) return null;
      updates += 1;
      event = { ...next, revision: expectedRevision + 1 };
      return { ...event, _id: documentId };
    },
  };
  const identity = new ChatMessageIdentity();
  const service = new QuizEventsService(
    repository as never,
    {} as never,
    {} as never,
    engine,
    new ChatParser(),
    new QuizMessageCandidateFilter(identity),
    new ChatMessageDeduplicator(identity),
    new QuizReadModelFactory(answerRanker),
  );
  return { service, event, questionId, updatesCount: () => updates };
}

test("imports, persists diagnostics, filters public chat, and makes repeated imports idempotent", async () => {
  const { service, questionId } = setup();
  const rawText = "21:00 [Alice] private [Dark] Минск\n21:01 [**StormBetter**] Объявление";
  const first = await service.appendChat(actor, "project", "event", questionId, rawText, 0);
  assert.deepEqual(first.importResult, {
    fragmentId: first.importResult.fragmentId,
    parsedMessagesCount: 2,
    candidateMessagesCount: 1,
    addedMessagesCount: 1,
    duplicateMessagesCount: 0,
  });
  assert.deepEqual(
    first.event.questions[0].playerGroups.map((group) => group.playerName),
    ["Alice"],
  );

  const repeated = await service.appendChat(actor, "project", "event", questionId, rawText, first.event.revision);
  assert.equal(repeated.importResult.addedMessagesCount, 0);
  assert.equal(repeated.importResult.duplicateMessagesCount, 1);
  assert.equal(repeated.event.questions[0].chatFragments.length, 2);
  assert.equal(repeated.event.questions[0].playerGroups[0].messages.length, 1);
  assert.equal(repeated.mutation.effectiveChange, false);
  assert.equal(repeated.mutation.previousMessagesCount, 1);
  assert.equal(repeated.mutation.nextMessagesCount, 1);
});

test("replaces the effective chat, retains canonical IDs, and rejects an empty replacement", async () => {
  const { service, questionId } = setup();
  const first = await service.appendChat(
    actor,
    "project",
    "event",
    questionId,
    "21:00 [Alice] private [Dark] old\n21:01 [Bob] private [Dark] removed",
    0,
  );
  const aliceId = first.event.questions[0].playerGroups[0].messages[0].id;

  const replaced = await service.replaceChat(
    actor,
    "project",
    "event",
    questionId,
    "21:00 [Cara] private [Dark] new\n21:00 [Alice] private [Dark] old",
    first.event.revision,
  );

  const groups = replaced.event.questions[0].playerGroups;
  assert.deepEqual(groups.map((group) => group.playerName), ["Cara", "Alice"]);
  assert.equal(groups.find((group) => group.playerName === "Alice")?.messages[0].id, aliceId);
  assert.deepEqual(replaced.mutation, {
    fragmentId: replaced.mutation.fragmentId,
    mode: "replace",
    parsedMessagesCount: 2,
    candidateMessagesCount: 2,
    duplicateMessagesCount: 0,
    previousMessagesCount: 2,
    nextMessagesCount: 2,
    addedMessagesCount: 1,
    removedMessagesCount: 1,
    retainedMessagesCount: 1,
    removedPersistedSelectionsCount: 0,
    effectiveChange: true,
  });

  await assert.rejects(
    () => service.replaceChat(actor, "project", "event", questionId, "21:03 [**StormBetter**] public", replaced.event.revision),
    (error: { code?: string }) => error.code === "quiz_validation_error",
  );
});

test("clears effective chat and reports a no-op clear without a revision change", async () => {
  const { service, questionId } = setup();
  const imported = await service.appendChat(
    actor,
    "project",
    "event",
    questionId,
    "21:00 [Alice] private [Dark] answer",
    0,
  );

  const cleared = await service.clearChat(actor, "project", "event", questionId, imported.event.revision);
  assert.equal(cleared.event.questions[0].playerGroups.length, 0);
  assert.equal(cleared.mutation.removedMessagesCount, 1);
  assert.equal(cleared.mutation.effectiveChange, true);

  const noOp = await service.clearChat(actor, "project", "event", questionId, cleared.event.revision);
  assert.equal(noOp.event.revision, cleared.event.revision);
  assert.equal(noOp.mutation.effectiveChange, false);
});

test("saves a complete selection set atomically and treats an equivalent set as a no-op", async () => {
  const { service, questionId, updatesCount } = setup();
  const imported = await service.appendChat(
    actor,
    "project",
    "event",
    questionId,
    "21:02 [Alice] private [Dark] late\n21:01 [Bob] private [Dark] early",
    0,
  );
  const messageIdByPlayer = new Map(
    imported.event.questions[0].playerGroups.map((group) => [group.playerName, group.messages[0].id]),
  );
  const alice = messageIdByPlayer.get("Alice")!;
  const bob = messageIdByPlayer.get("Bob")!;
  const updatesBeforeInvalidSave = updatesCount();

  await assert.rejects(
    () => service.saveAnswerSelections(actor, "project", "event", questionId, [
      { playerName: "Alice", selectedMessageId: alice },
      { playerName: "Bob", selectedMessageId: alice },
    ], imported.event.revision),
    (error: { code?: string }) => error.code === "quiz_player_answer_selection_error",
  );
  assert.equal(updatesCount(), updatesBeforeInvalidSave);

  const saved = await service.saveAnswerSelections(actor, "project", "event", questionId, [
    { playerName: "Alice", selectedMessageId: alice },
    { playerName: "Bob", selectedMessageId: bob },
  ], imported.event.revision);
  assert.deepEqual(saved.ranking.map((answer) => answer.playerName), ["Bob", "Alice"]);
  assert.deepEqual(saved.result, { previousSelectionsCount: 0, nextSelectionsCount: 2, effectiveChange: true });

  const noOp = await service.saveAnswerSelections(actor, "project", "event", questionId, [
    { playerName: "Bob", selectedMessageId: bob },
    { playerName: "Alice", selectedMessageId: alice },
  ], saved.event.revision);
  assert.equal(noOp.event.revision, saved.event.revision);
  assert.equal(noOp.result.effectiveChange, false);
  assert.equal(updatesCount(), updatesBeforeInvalidSave + 1);

  const changed = await service.saveAnswerSelections(
    actor,
    "project",
    "event",
    questionId,
    [{ playerName: "Bob", selectedMessageId: bob }],
    noOp.event.revision,
  );
  assert.deepEqual(changed.ranking.map((answer) => answer.playerName), ["Bob"]);
  assert.deepEqual(changed.result, { previousSelectionsCount: 2, nextSelectionsCount: 1, effectiveChange: true });
});

test("rejects a stale revision without overwriting the current event", async () => {
  const { service } = setup();
  const completed = await service.complete(actor, "project", "event", 0);

  await assert.rejects(
    () => service.reopen(actor, "project", "event", 0),
    (error: { code?: string }) => error.code === "quiz_event_revision_conflict",
  );
  assert.equal(completed.status, "completed");
  assert.equal(completed.revision, 1);
});

test("reviews through the service command and returns the compact review result", async () => {
  const { service, questionId } = setup();

  const reviewed = await service.review(actor, "project", "event", questionId, 0);

  assert.equal(reviewed.event.revision, 1);
  assert.deepEqual(reviewed.result, {
    conductedOrder: 1,
    awardsCount: 0,
    reviewedAt: reviewed.result.reviewedAt,
    nextUnconductedQuestionId: null,
  });
});

test("enforces event ownership and completed read-only state for question mutations", async () => {
  const { service, questionId } = setup();
  const anotherHost: CurrentUser = { ...actor, id: "another-host" };

  await assert.rejects(
    () => service.review(anotherHost, "project", "event", questionId, 0),
    (error: { code?: string }) => error.code === "FORBIDDEN",
  );

  const completed = await service.complete(actor, "project", "event", 0);
  await assert.rejects(
    () => service.appendChat(actor, "project", "event", questionId, "21:00 [Alice] private [Dark] answer", completed.revision),
    (error: { code?: string }) => error.code === "quiz_conflict",
  );
});
