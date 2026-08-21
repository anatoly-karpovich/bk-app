import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { CurrentUser } from "../../auth/domain/types";
import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatParser } from "../../chat/ChatParser";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventEngine } from "../QuizEventEngine/QuizEventEngine";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizEventReadModelFactory } from "../QuizEventReadModelFactory";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";
import type { QuizEventDocument, QuizSnapshot } from "../domain/types";
import { QuizQuestionResultOrderError, QuizQuestionResultsLockedError } from "../errors";
import { QuizEventsService } from "./QuizEventsService";

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
      id: "source",
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

function setup(sourceSnapshot: QuizSnapshot = snapshot, hostNickname = "Dark") {
  const ranker = new QuizAnswerRanker();
  const engine = new QuizEventEngine(
    ranker,
    new QuizAwardCalculator(),
    new QuizEventSummaryCalculator(),
    new QuizSelectedAnswerPruner(),
  );
  let event = engine.create(sourceSnapshot, { userId: "host", displayName: "Host", nickname: hostNickname }, "Event");
  event.projectId = "project";
  const documentId = new ObjectId();
  const repository = {
    findByIdAndProjectId: async () => ({ ...event, _id: documentId }),
    update: async (_id: string, _project: string, revision: number, next: QuizEventDocument) => {
      if (event.revision !== revision) return null;
      event = { ...next, revision: revision + 1 };
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
    new QuizEventReadModelFactory(ranker),
  );
  return { service, questionId: event.questions[0].id, questionIds: event.questions.map((question) => question.id) };
}

test("saves a complete chat, preserves ids on equivalent saves, and saves the final result", async () => {
  const { service, questionId } = setup();
  const raw = "21:00 [Alice] private [Dark] Минск";
  const first = await service.saveQuestionChat(actor, "project", "event", questionId, raw, 0);
  assert.equal(first.event.state.questions[0].workflow.conductedOrder, 1);
  assert.equal(first.mutation.effectiveChange, true);
  const repeat = await service.saveQuestionChat(actor, "project", "event", questionId, raw, first.event.meta.revision);
  assert.equal(repeat.mutation.effectiveChange, false);
  const messageId = repeat.event.state.questions[0].chat.playerGroups[0].messages[0].id;
  const result = await service.saveQuestionResult(
    actor,
    "project",
    "event",
    questionId,
    [{ playerName: "Alice", selectedMessageId: messageId }],
    repeat.event.meta.revision,
  );
  assert.ok(result.result.reviewedAt);
  assert.equal(result.event.state.questions[0].result.awards.length, 1);
});

test("preserves separate to and private answers from the same player", async () => {
  const { service, questionId } = setup(snapshot, "Molly");
  const answer = "Что такое осень - это свиньи! свиньи плещутся в канавееее...";
  const raw = [
    `20:39 [Геральт из Ривии] to [Molly] ${answer}`,
    `20:39 [Геральт из Ривии] private [ Molly ] ${answer}`,
  ].join("\n");

  const saved = await service.saveQuestionChat(actor, "project", "event", questionId, raw, 0);
  const messages = saved.event.state.questions[0].chat.playerGroups[0]!.messages;
  assert.equal(saved.mutation.candidateMessagesCount, 2);
  assert.deepEqual(messages.map((message) => message.transport), ["to", "private"]);
  assert.equal(new Set(messages.map((message) => message.id)).size, 2);
});

test("preserves exact repeated answers with stable distinct ids on repeated saves", async () => {
  const { service, questionId } = setup();
  const raw = [
    "20:39 [Геральт из Ривии] private [Dark] ДДТ Осень",
    "20:39 [Геральт из Ривии] private [Dark] ДДТ Осень",
  ].join("\n");

  const first = await service.saveQuestionChat(actor, "project", "event", questionId, raw, 0);
  const firstMessages = first.event.state.questions[0].chat.playerGroups[0]!.messages;
  assert.equal(first.mutation.candidateMessagesCount, 2);
  assert.equal(firstMessages.length, 2);
  assert.equal(new Set(firstMessages.map((message) => message.id)).size, 2);

  const repeated = await service.saveQuestionChat(actor, "project", "event", questionId, raw, first.event.meta.revision);
  const repeatedMessages = repeated.event.state.questions[0].chat.playerGroups[0]!.messages;
  assert.equal(repeated.mutation.effectiveChange, false);
  assert.deepEqual(repeatedMessages.map((message) => message.id), firstMessages.map((message) => message.id));

  const result = await service.saveQuestionResult(
    actor,
    "project",
    "event",
    questionId,
    [{ playerName: "Геральт из Ривии", selectedMessageId: repeatedMessages[1]!.id }],
    repeated.event.meta.revision,
  );
  assert.equal(result.event.state.questions[0].result.ranking[0]?.selectedMessageId, repeatedMessages[1]!.id);
});

test("rejects non-empty chat without candidates and accepts an explicit empty clear", async () => {
  const { service, questionId } = setup();
  await assert.rejects(() => service.saveQuestionChat(actor, "project", "event", questionId, "not chat", 0));
  const saved = await service.saveQuestionChat(actor, "project", "event", questionId, "", 0);
  assert.equal(saved.event.state.questions[0].chat.rawText, "");
});

test("requires reviewed results in conducted order and locks earlier results after a later result is saved", async () => {
  const limitedSnapshot = structuredClone(snapshot);
  limitedSnapshot.configRulesSnapshot.limitOneBonusPerPlayer = true;
  limitedSnapshot.configRulesSnapshot.questionCount = 2;
  limitedSnapshot.questions = [
    ...limitedSnapshot.questions,
    {
      id: "source-2",
      questionIndex: 2,
      title: null,
      text: "Question 2",
      correctAnswer: null,
      attachmentUrl: null,
      notes: null,
    },
  ];
  const { service, questionIds } = setup(limitedSnapshot);
  const firstChat = await service.saveQuestionChat(
    actor,
    "project",
    "event",
    questionIds[0]!,
    "21:00 [Alice] private [Dark] one",
    0,
  );
  const secondChat = await service.saveQuestionChat(
    actor,
    "project",
    "event",
    questionIds[1]!,
    "21:01 [Bob] private [Dark] two",
    firstChat.event.meta.revision,
  );
  const secondMessageId = secondChat.event.state.questions[1].chat.playerGroups[0].messages[0].id;

  await assert.rejects(
    () =>
      service.saveQuestionResult(
        actor,
        "project",
        "event",
        questionIds[1]!,
        [{ playerName: "Bob", selectedMessageId: secondMessageId }],
        secondChat.event.meta.revision,
      ),
    QuizQuestionResultOrderError,
  );

  const firstMessageId = secondChat.event.state.questions[0].chat.playerGroups[0].messages[0].id;
  const firstResult = await service.saveQuestionResult(
    actor,
    "project",
    "event",
    questionIds[0]!,
    [{ playerName: "Alice", selectedMessageId: firstMessageId }],
    secondChat.event.meta.revision,
  );
  const secondResult = await service.saveQuestionResult(
    actor,
    "project",
    "event",
    questionIds[1]!,
    [{ playerName: "Bob", selectedMessageId: secondMessageId }],
    firstResult.event.meta.revision,
  );

  await assert.rejects(
    () => service.markAsUnreviewed(actor, "project", "event", questionIds[0]!, secondResult.event.meta.revision),
    QuizQuestionResultsLockedError,
  );
});
