import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { QuizAward, QuizEventDocument, QuizEventQuestion, QuizSnapshot } from "../../quizzes/domain/types";
import { QuizEventAnalyticsAdapter } from "./QuizEventAnalyticsAdapter";

const computedAt = "2026-08-25T13:00:00.000Z";

function createSnapshot(): QuizSnapshot {
  const templates = { defaultTemplate: { template: "{text}", variables: {} }, questionOverrides: [] };
  return {
    quizId: "quiz-1",
    configId: "config-1",
    quizName: "Quiz",
    quizDescription: "",
    configRulesSnapshot: {
      configId: "config-1",
      configName: "Config",
      questionCount: 2,
      defaultRegularRule: { mode: "all_accepted", rewardPool: { mode: "all", rewards: [] } },
      regularRewardOverrides: [],
      bonusRules: [],
      messageTemplates: templates,
      answerMessageTemplates: templates,
      capturedAt: "2026-08-24T10:00:00.000Z",
      schemaVersion: 1,
    },
    resources: [
      { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 },
    ],
    questions: [],
    effectiveMessageTemplates: templates,
    effectiveAnswerMessageTemplates: templates,
    capturedAt: "2026-08-24T10:00:00.000Z",
    schemaVersion: 1,
  };
}

function createAward(
  id: string,
  playerName: string,
  playerRefId: string | undefined,
  kind: QuizAward["source"]["kind"],
  amount: number,
): QuizAward {
  return {
    id,
    selectedMessageId: `message-${id}`,
    playerName,
    ...(playerRefId ? { playerRefId } : {}),
    questionIndex: 1,
    source: {
      kind,
      questionIndex: 1,
      conductedOrder: 1,
      position: kind === "regular_all" ? null : 1,
      regularRuleMode: kind === "bonus_position" ? null : "all_accepted",
      bonusRuleId: kind === "bonus_position" ? "bonus-1" : null,
    },
    rewards: [{ resourceId: "coins", amount }],
    awardedAt: "2026-08-25T09:00:00.000Z",
  };
}

function createQuestion(id: string, awards: QuizAward[]): QuizEventQuestion {
  return {
    id,
    quizQuestionId: `quiz-${id}`,
    questionIndex: 1,
    conductedOrder: 1,
    reviewedAt: "2026-08-25T09:00:00.000Z",
    reviewedByUserId: "host-1",
    message: {
      messageTextOverride: null,
      messageTextUpdatedAt: null,
      messageTextUpdatedByUserId: null,
      answerTextOverride: null,
      answerTextUpdatedAt: null,
      answerTextUpdatedByUserId: null,
    },
    chat: { rawText: "", messages: [], updatedAt: null, updatedByUserId: null },
    selectedAnswers: [{ playerName: "Selected but unawarded", playerRefId: "player-3", selectedMessageId: "message-unawarded" }],
    awards,
    updatedAt: "2026-08-25T09:00:00.000Z",
  };
}

function createCompletedEvent(overrides: Partial<QuizEventDocument> = {}): WithId<QuizEventDocument> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e779ab"),
    projectId: "project-1",
    quizId: "quiz-1",
    quizSnapshot: createSnapshot(),
    name: "Quiz event",
    hostUserId: "host-1",
    hostSnapshot: { userId: "host-1", displayName: "Host", nickname: "Host" },
    status: "completed",
    revision: 7,
    questions: [
      createQuestion("question-1", [
        createAward("regular-1", "Alice", "player-1", "regular_all", 2),
        createAward("regular-2", "Bob", "player-2", "regular_position", 1),
      ]),
      createQuestion("question-2", [createAward("bonus-1", "Alice", "player-1", "bonus_position", 5)]),
    ],
    summary: null,
    completedAt: "2026-08-25T10:00:00.000Z",
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-25T10:05:00.000Z",
    schemaVersion: 3,
    ...overrides,
  };
}

function createAdapter() {
  return new QuizEventAnalyticsAdapter({ async findCompletedByProjectId() { return []; } } as never, () => computedAt);
}

test("maps only saved Quiz Event awards, groups them by player reference, and preserves categories", () => {
  const fact = createAdapter().buildFact(createCompletedEvent());

  assert.deepEqual(fact.participants, [
    {
      playerRefId: "player-1",
      nicknameSnapshot: "Alice",
      rewards: { regular: [{ resourceId: "coins", amount: 2 }], bonus: [{ resourceId: "coins", amount: 5 }] },
    },
    {
      playerRefId: "player-2",
      nicknameSnapshot: "Bob",
      rewards: { regular: [{ resourceId: "coins", amount: 1 }], bonus: [] },
    },
  ]);
  assert.deepEqual(fact.resourceSnapshot, createSnapshot().resources);
  assert.equal(fact.participants.some((participant) => participant.playerRefId === "player-3"), false);
});

test("uses updatedAt only as the historical fallback when a completed Quiz Event has no completedAt", () => {
  const event = createCompletedEvent({ completedAt: null });

  const descriptor = createAdapter().describe(event);

  assert.equal(descriptor.occurredOn, "2026-08-25");
  assert.equal(descriptor.occurrenceDateSource, "finalized_at");
  assert.deepEqual(descriptor.source, {
    kind: "quiz_event",
    type: "quiz",
    id: event._id.toHexString(),
    titleSnapshot: "Викторина «Quiz event»",
    quizId: "quiz-1",
    revision: 7,
    updatedAt: "2026-08-25T10:05:00.000Z",
  });
});

test("prefers an explicit Quiz Event conducted date over the technical completion date", () => {
  const descriptor = createAdapter().describe(createCompletedEvent({ conductedOn: "2024-03-15" }));

  assert.equal(descriptor.occurredOn, "2024-03-15");
  assert.equal(descriptor.occurrenceDateSource, "conducted_on");
});

test("publishes every legacy Quiz award without a player reference as a separate unresolved participant", () => {
  const event = createCompletedEvent({
    questions: [
      createQuestion("question-1", [
        createAward("legacy-regular", "Historical nickname", undefined, "regular_all", 3),
        createAward("legacy-bonus", "Historical nickname", undefined, "bonus_position", 4),
      ]),
    ],
  });

  const fact = createAdapter().buildFact(event);

  assert.deepEqual(fact.participants, [
    {
      playerRefId: null,
      nicknameSnapshot: "Historical nickname",
      rewards: { regular: [{ resourceId: "coins", amount: 3 }], bonus: [] },
    },
    {
      playerRefId: null,
      nicknameSnapshot: "Historical nickname",
      rewards: { regular: [], bonus: [{ resourceId: "coins", amount: 4 }] },
    },
  ]);
  assert.deepEqual(fact.meta, {
    status: "partial",
    issues: [
      { code: "missing_player_reference", nicknameSnapshot: "Historical nickname" },
      { code: "missing_player_reference", nicknameSnapshot: "Historical nickname" },
    ],
    computedAt,
    schemaVersion: 3,
  });
});

test("delegates project-scoped completed-source reads to the Quiz Events repository", async () => {
  const event = createCompletedEvent();
  let requestedProjectId: string | undefined;
  const adapter = new QuizEventAnalyticsAdapter({
    async findCompletedByProjectId(projectId: string) {
      requestedProjectId = projectId;
      return [event];
    },
  } as never, () => computedAt);

  const sources = await adapter.findFinishedByProjectId("project-1");

  assert.equal(requestedProjectId, "project-1");
  assert.deepEqual(sources, [event]);
});
