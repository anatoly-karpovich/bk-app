import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { ChatMessageIdentity } from "../../chat/ChatMessageIdentity";
import { ChatParser } from "../../chat/ChatParser";
import type { CurrentUser } from "../../auth/domain/types";
import { RewardGrantService, type Randomizer } from "../../rewards";
import { ChatMessageDeduplicator } from "../ChatMessageDeduplicator/ChatMessageDeduplicator";
import { QuizAnswerRanker } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizEventsService } from "./QuizEventsService";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizReadModelFactory } from "../QuizReadModelFactory";
import type { QuizEventDocument, QuizSnapshot } from "../domain/types";
import { QuizEventEngine } from "../QuizEventEngine/QuizEventEngine";

const randomizer: Randomizer = { succeeds: () => true, pickWeightedIndex: () => 0 };
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

function setup(): { service: QuizEventsService; event: QuizEventDocument; questionId: string } {
  const engine = new QuizEventEngine(new RewardGrantService(randomizer), new QuizAnswerRanker());
  let event = engine.create(snapshot, { userId: actor.id, displayName: actor.displayName, nickname: "Dark" }, "Event");
  event.projectId = "project";
  const questionId = event.questions[0].id;
  const documentId = new ObjectId();
  const repository = {
    findByIdAndProjectId: async () => ({ ...event, _id: documentId }),
    update: async (_id: string, _projectId: string, next: QuizEventDocument) => {
      event = next;
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
    new QuizReadModelFactory(engine),
  );
  return { service, event, questionId };
}

test("imports, persists diagnostics, filters public chat, and makes repeated imports idempotent", async () => {
  const { service, questionId } = setup();
  const rawText = "21:00 [Alice] private [Dark] Минск\n21:01 [**StormBetter**] Объявление";
  const first = await service.addChatFragment(actor, "project", "event", questionId, rawText);
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

  const repeated = await service.addChatFragment(actor, "project", "event", questionId, rawText);
  assert.equal(repeated.importResult.addedMessagesCount, 0);
  assert.equal(repeated.importResult.duplicateMessagesCount, 1);
  assert.equal(repeated.event.questions[0].chatFragments.length, 2);
  assert.equal(repeated.event.questions[0].playerGroups[0].messages.length, 1);
});
