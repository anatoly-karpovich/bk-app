import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsReadService } from "./AnalyticsReadService";
import type { AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import type { AnalyticsFactDocument, AnalyticsParticipantResult } from "./domain/types";
import { AnalyticsInvalidQueryError } from "./errors/AnalyticsInvalidQueryError";
import type { ResourceSnapshot } from "../rewards";

const currentCoin = {
  id: "coins",
  code: "coins",
  name: "Coins",
  label: "coins",
  type: "currency" as const,
  valueType: "integer" as const,
  precision: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const currentItem = {
  id: "key",
  code: "key",
  name: "Key",
  label: "keys",
  type: "item" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const historicalCoin = {
  id: "old-coins",
  code: "old-coins",
  name: "Old coins",
  label: "old coins",
  type: "currency" as const,
  valueType: "integer" as const,
  precision: 0,
};

const freshIntegrity: AnalyticsIntegrityReport = {
  freshness: "fresh",
  sourceCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
  factCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
  missing: [],
  orphan: [],
  outdated: [],
  partialFacts: [],
};

function participant(
  playerRefId: string | null,
  nicknameSnapshot: string,
  regular: Array<{ resourceId: string; amount: number }> = [],
  bonus: Array<{ resourceId: string; amount: number }> = [],
): AnalyticsParticipantResult {
  return { playerRefId, nicknameSnapshot, rewards: { regular, bonus } };
}

function fact(
  id: string,
  sourceType: AnalyticsFactDocument["source"]["type"],
  occurredAt: string,
  participants: AnalyticsParticipantResult[],
  resourceSnapshot: ResourceSnapshot[] = [currentCoin],
): AnalyticsFactDocument {
  return {
    projectId: "project-a",
    occurredAt,
    source: {
      kind: sourceType === "quiz" ? "quiz_event" : "game",
      type: sourceType,
      id,
      ...(sourceType === "quiz" ? { quizId: "quiz-a" } : {}),
      revision: sourceType === "quiz" ? 1 : null,
      updatedAt: occurredAt,
    },
    participants,
    resourceSnapshot,
    meta: { status: "ready", issues: [], computedAt: occurredAt, schemaVersion: 1 },
  };
}

function createService(
  facts: AnalyticsFactDocument[],
  options: { resources?: Array<typeof currentCoin | typeof currentItem>; integrity?: AnalyticsIntegrityReport } = {},
) {
  const project = {
    _id: "project-a",
    code: "project-a",
    name: "Project A",
    description: "",
    resources: options.resources ?? [currentCoin, currentItem],
    createdByUserId: "user-a",
    updatedByUserId: "user-a",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return new AnalyticsReadService(
    { async findByProjectId() { return facts; } } as never,
    { async inspectProject() { return options.integrity ?? freshIntegrity; } } as never,
    { async findById() { return project; } } as never,
    () => new Date("2026-08-25T12:00:00.000Z"),
  );
}

test("builds an overview from filtered facts without mixing sources, resources, or unresolved identities", async () => {
  const service = createService([
    fact("journey-1", "journey", "2026-08-05T10:00:00.000Z", [
      participant("player-1", "Old nickname", [{ resourceId: "coins", amount: 4 }], [{ resourceId: "key", amount: 1 }]),
    ]),
    fact("quiz-1", "quiz", "2026-08-06T10:00:00.000Z", [
      participant("player-1", "New nickname", [{ resourceId: "coins", amount: 3 }]),
      participant(null, "Historical nickname", [{ resourceId: "coins", amount: 2 }]),
    ]),
    fact("lotto-1", "lotto", "2026-07-31T10:00:00.000Z", [participant("player-2", "Outside period", [{ resourceId: "coins", amount: 99 }])]),
  ]);

  const overview = await service.getOverview("project-a", {
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-09-01T00:00:00.000Z",
    sourceTypes: ["journey", "quiz"],
  });

  assert.equal(overview.conductedSources, 2);
  assert.equal(overview.participations, 3);
  assert.equal(overview.uniqueResolvedPlayers, 1);
  assert.deepEqual(overview.rewardsByResource, [
    { resourceId: "coins", rewards: { regular: 9, bonus: 0, total: 9 } },
    { resourceId: "key", rewards: { regular: 0, bonus: 1, total: 1 } },
  ]);
  assert.deepEqual(overview.sourceBreakdown.journey, { conductedSources: 1, participations: 1 });
  assert.deepEqual(overview.sourceBreakdown.quiz, { conductedSources: 1, participations: 2 });
  assert.deepEqual(overview.sourceBreakdown.lotto, { conductedSources: 0, participations: 0 });
  assert.deepEqual(overview.activityByDay, [
    { date: "2026-08-05", conductedSources: 1, participations: 1 },
    { date: "2026-08-06", conductedSources: 1, participations: 2 },
  ]);
  assert.deepEqual(overview.rewardsByDay, [
    {
      date: "2026-08-05",
      rewardsByResource: [
        { resourceId: "coins", rewards: { regular: 4, bonus: 0, total: 4 } },
        { resourceId: "key", rewards: { regular: 0, bonus: 1, total: 1 } },
      ],
    },
    {
      date: "2026-08-06",
      rewardsByResource: [{ resourceId: "coins", rewards: { regular: 5, bonus: 0, total: 5 } }],
    },
  ]);
  assert.equal(overview.integrity, freshIntegrity);
});

test("keeps current resources selectable and exposes historical source snapshots with separate totals", async () => {
  const service = createService([
    fact(
      "journey-1",
      "journey",
      "2026-08-05T10:00:00.000Z",
      [participant("player-1", "Player", [{ resourceId: "old-coins", amount: 7 }])],
      [historicalCoin],
    ),
  ]);

  const resources = await service.getResources("project-a");

  assert.deepEqual(resources.resources.map(({ resource, catalogStatus, rewards }) => ({ id: resource.id, catalogStatus, rewards })), [
    { id: "coins", catalogStatus: "current", rewards: { regular: 0, bonus: 0, total: 0 } },
    { id: "key", catalogStatus: "current", rewards: { regular: 0, bonus: 0, total: 0 } },
    { id: "old-coins", catalogStatus: "historical", rewards: { regular: 7, bonus: 0, total: 7 } },
  ]);

  const leaderboard = await service.getPlayerLeaderboard("project-a", { resourceId: "old-coins" });
  assert.equal(leaderboard.resource.catalogStatus, "historical");
  assert.equal(leaderboard.players[0].rewards.total, 7);
});

test("uses the first current currency by default and provides stable score/player-id cursor pagination", async () => {
  const service = createService([
    fact("one", "journey", "2026-08-01T10:00:00.000Z", [participant("player-1", "Old name", [{ resourceId: "coins", amount: 5 }])]),
    fact("two", "quiz", "2026-08-03T10:00:00.000Z", [participant("player-1", "Newest name", [], [{ resourceId: "coins", amount: 1 }])]),
    fact("three", "lotto", "2026-08-04T10:00:00.000Z", [participant("player-2", "Second player", [{ resourceId: "coins", amount: 6 }])]),
    fact("four", "battleships", "2026-08-05T10:00:00.000Z", [participant("player-3", "Third player", [{ resourceId: "coins", amount: 2 }])]),
    fact("five", "journey", "2026-08-06T10:00:00.000Z", [participant(null, "Unresolved", [{ resourceId: "coins", amount: 100 }])]),
  ]);

  const firstPage = await service.getPlayerLeaderboard("project-a", { limit: 1 });
  const secondPage = await service.getPlayerLeaderboard("project-a", { limit: 1, cursor: firstPage.nextCursor! });

  assert.equal(firstPage.resource.resource.id, "coins");
  assert.deepEqual(firstPage.players, [
    {
      playerRefId: "player-1",
      nicknameSnapshot: "Newest name",
      participations: 2,
      rewards: { regular: 5, bonus: 1, total: 6 },
    },
  ]);
  assert.equal(secondPage.players[0].playerRefId, "player-2");
  assert.equal(secondPage.players[0].rewards.total, 6);
});

test("sorts player leaderboard by the selected saved reward category", async () => {
  const service = createService([
    fact("one", "journey", "2026-08-01T10:00:00.000Z", [participant("player-1", "Regular", [{ resourceId: "coins", amount: 10 }], [{ resourceId: "coins", amount: 1 }])]),
    fact("two", "quiz", "2026-08-02T10:00:00.000Z", [participant("player-2", "Bonus", [{ resourceId: "coins", amount: 2 }], [{ resourceId: "coins", amount: 20 }])]),
    fact("three", "lotto", "2026-08-03T10:00:00.000Z", [participant("player-3", "No reward")]),
  ]);

  const regular = await service.getPlayerLeaderboard("project-a", { rewardCategory: "regular" });
  const bonus = await service.getPlayerLeaderboard("project-a", { rewardCategory: "bonus" });

  assert.equal(regular.rewardCategory, "regular");
  assert.equal(regular.players[0].playerRefId, "player-1");
  assert.equal(bonus.rewardCategory, "bonus");
  assert.equal(bonus.players[0].playerRefId, "player-2");
  assert.equal(regular.players.some((player) => player.playerRefId === "player-3"), false);
  assert.equal(bonus.players.some((player) => player.playerRefId === "player-3"), false);
});

test("validates non-mixed resource selection and internal read-query bounds", async () => {
  const service = createService([]);

  await assert.rejects(service.getPlayerLeaderboard("project-a", { resourceId: "unknown" }), AnalyticsInvalidQueryError);
  await assert.rejects(service.getOverview("project-a", { from: "2026-09-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" }), AnalyticsInvalidQueryError);
  await assert.rejects(service.getPlayerLeaderboard("project-a", { limit: 101 }), AnalyticsInvalidQueryError);
  await assert.rejects(service.getPlayerLeaderboard("project-a", { cursor: "not-a-cursor" }), AnalyticsInvalidQueryError);
});
