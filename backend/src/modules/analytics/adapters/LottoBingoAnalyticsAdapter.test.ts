import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { LottoBingoGame } from "../../lottoBingo/domain/types";
import { LottoBingoAnalyticsAdapter } from "./LottoBingoAnalyticsAdapter";

const computedAt = "2026-08-25T13:00:00.000Z";

function createFinishedGame(overrides: Partial<LottoBingoGame> = {}): WithId<LottoBingoGame> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e779ba"),
    projectId: "project-1",
    configId: "config-1",
    configName: "Config",
    hostUserId: "host-1",
    hostSnapshot: { userId: "host-1", displayName: "Host", nickname: "Host" },
    rules: {
      barrelsToDraw: 87,
      rewards: {
        round1: { mode: "all", rewards: [] },
        round2: { mode: "all", rewards: [] },
        round3: { mode: "all", rewards: [] },
        completedCard: { mode: "all", rewards: [] },
        consolation: { mode: "all", rewards: [] },
      },
    },
    resources: [
      { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 },
    ],
    status: "finished",
    players: [
      {
        id: "round-winner-1",
        playerRefId: "player-1",
        nickname: "Round winner",
        ticket: { number: 1, grid: [[1]] },
        status: "round_winner",
        award: { type: "round", round: 1, rewards: [{ resourceId: "coins", amount: 2 }] },
      },
      {
        id: "final-winner-1",
        playerRefId: "player-2",
        nickname: "Final winner",
        ticket: { number: 2, grid: [[2]] },
        status: "active",
        award: { type: "completed_card", rewards: [{ resourceId: "coins", amount: 7 }] },
      },
      {
        id: "non-winner-1",
        playerRefId: "player-3",
        nickname: "Non-winner",
        ticket: { number: 3, grid: [[3]] },
        status: "active",
        award: null,
      },
      {
        id: "disqualified-1",
        playerRefId: "player-4",
        nickname: "Disqualified",
        ticket: { number: 4, grid: [[4]] },
        status: "disqualified",
        award: null,
      },
    ],
    nextTicketNumber: 5,
    draw: null,
    winners: { round1: [], round2: [], round3: [] },
    payouts: [
      {
        id: "payout-round-1",
        playerId: "round-winner-1",
        category: "round1",
        resolvedRewards: [{ resourceId: "coins", amount: 2 }],
        createdAt: "2026-08-25T09:00:00.000Z",
      },
      {
        id: "payout-final-1",
        playerId: "final-winner-1",
        category: "completed_card",
        resolvedRewards: [{ resourceId: "coins", amount: 7 }],
        createdAt: "2026-08-25T09:05:00.000Z",
      },
      {
        id: "payout-disqualified-1",
        playerId: "disqualified-1",
        category: "consolation",
        resolvedRewards: [{ resourceId: "coins", amount: 999 }],
        createdAt: "2026-08-25T09:10:00.000Z",
      },
    ],
    eligibility: null,
    revision: 7,
    lastMutation: "game_finished",
    audit: [],
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-25T10:05:00.000Z",
    startedAt: "2026-08-25T08:00:00.000Z",
    finishedAt: "2026-08-25T10:00:00.000Z",
    ...overrides,
  };
}

function createAdapter() {
  return new LottoBingoAnalyticsAdapter({
    async findFinishedByProjectId() {
      return [];
    },
  } as never, () => computedAt);
}

test("maps saved Lotto Bingo round payouts to bonus and final payouts to regular without including disqualified players", () => {
  const fact = createAdapter().buildFact(createFinishedGame());

  assert.deepEqual(fact.participants, [
    {
      playerRefId: "player-1",
      nicknameSnapshot: "Round winner",
      rewards: { regular: [], bonus: [{ resourceId: "coins", amount: 2 }] },
    },
    {
      playerRefId: "player-2",
      nicknameSnapshot: "Final winner",
      rewards: { regular: [{ resourceId: "coins", amount: 7 }], bonus: [] },
    },
    {
      playerRefId: "player-3",
      nicknameSnapshot: "Non-winner",
      rewards: { regular: [], bonus: [] },
    },
  ]);
  assert.equal(fact.participants.some((participant) => participant.nicknameSnapshot === "Disqualified"), false);
});

test("uses updatedAt only as the historical fallback when a finished Lotto Bingo game has no finishedAt", () => {
  const game = createFinishedGame({ finishedAt: null });

  const descriptor = createAdapter().describe(game);

  assert.equal(descriptor.occurredOn, "2026-08-25");
  assert.equal(descriptor.occurrenceDateSource, "finalized_at");
  assert.deepEqual(descriptor.source, {
    kind: "game",
    type: "lotto_bingo",
    id: game._id.toHexString(),
    titleSnapshot: "Лото Бинго",
    revision: 7,
    updatedAt: "2026-08-25T10:05:00.000Z",
  });
});

test("prefers an explicit Lotto Bingo conducted date over the technical finalization date", () => {
  const descriptor = createAdapter().describe(createFinishedGame({ conductedOn: "2024-03-15" }));

  assert.equal(descriptor.occurredOn, "2024-03-15");
  assert.equal(descriptor.occurrenceDateSource, "conducted_on");
});

test("publishes legacy Lotto Bingo participants without player references as partial facts without matching their nicknames", () => {
  const game = createFinishedGame({
    players: [
      {
        id: "legacy-player-1",
        nickname: "Historical nickname",
        ticket: { number: 1, grid: [[1]] },
        status: "active",
        award: { type: "consolation", rewards: [{ resourceId: "coins", amount: 4 }] },
      },
    ],
    payouts: [
      {
        id: "legacy-payout-1",
        playerId: "legacy-player-1",
        category: "consolation",
        resolvedRewards: [{ resourceId: "coins", amount: 4 }],
        createdAt: "2026-08-25T09:00:00.000Z",
      },
    ],
  });

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact.participants, [
    {
      playerRefId: null,
      nicknameSnapshot: "Historical nickname",
      rewards: { regular: [{ resourceId: "coins", amount: 4 }], bonus: [] },
    },
  ]);
  assert.deepEqual(fact.meta, {
    status: "partial",
    issues: [
      {
        code: "missing_player_reference",
        sourcePlayerId: "legacy-player-1",
        nicknameSnapshot: "Historical nickname",
      },
    ],
    computedAt,
    schemaVersion: 3,
  });
});

test("delegates project-scoped finished-source reads to the Lotto Bingo repository", async () => {
  const game = createFinishedGame();
  let requestedProjectId: string | undefined;
  const adapter = new LottoBingoAnalyticsAdapter({
    async findFinishedByProjectId(projectId: string) {
      requestedProjectId = projectId;
      return [game];
    },
  } as never, () => computedAt);

  const sources = await adapter.findFinishedByProjectId("project-1");

  assert.equal(requestedProjectId, "project-1");
  assert.deepEqual(sources, [game]);
});
