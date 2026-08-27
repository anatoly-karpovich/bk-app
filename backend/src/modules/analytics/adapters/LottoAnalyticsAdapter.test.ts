import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { LottoGame } from "../../lotto/domain/types";
import { LottoAnalyticsAdapter } from "./LottoAnalyticsAdapter";

const computedAt = "2026-08-25T12:00:00.000Z";

function createFinishedGame(overrides: Partial<LottoGame> = {}): WithId<LottoGame> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e779b9"),
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-25T10:05:00.000Z",
    finishedAt: "2026-08-25T10:00:00.000Z",
    status: "finished",
    djName: "DJ",
    projectId: "project-1",
    configId: "config-1",
    configName: "Config",
    resources: [
      { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 },
    ],
    rules: {
      min: 1,
      max: 3,
      cardNumbersAmount: 2,
      firstPlacePrize: { mode: "all", rewards: [] },
      secondPlacePrize: { mode: "all", rewards: [] },
      otherActivePlayersPrize: { mode: "all", rewards: [] },
      rewardDistributionMode: "split_pool",
    },
    drawnNumbers: [1, 2, 3],
    availableNumbers: [],
    players: [
      {
        id: "winner-1",
        playerRefId: "player-1",
        nickname: "Winner",
        status: "winner_first",
        removedAt: null,
        removedReason: null,
        cardNumbers: [1, 2],
      },
      {
        id: "non-winner-1",
        playerRefId: "player-2",
        nickname: "Non-winner",
        status: "active",
        removedAt: null,
        removedReason: null,
        cardNumbers: [2, 3],
      },
      {
        id: "removed-1",
        playerRefId: "player-3",
        nickname: "Removed",
        status: "removed",
        removedAt: "2026-08-25T09:00:00.000Z",
        removedReason: "left",
        cardNumbers: [1, 3],
      },
    ],
    payouts: [
      {
        playerId: "winner-1",
        place: 1,
        resolvedRewards: [{ resourceId: "coins", amount: 20 }],
        awardedRewards: [{ resourceId: "coins", amount: 3 }],
        payoutStatus: "split_pool",
      },
      {
        playerId: "winner-1",
        place: 2,
        resolvedRewards: [{ resourceId: "coins", amount: 20 }],
        awardedRewards: [{ resourceId: "coins", amount: 2 }],
        payoutStatus: "split_pool",
      },
      {
        playerId: "removed-1",
        place: 3,
        resolvedRewards: [{ resourceId: "coins", amount: 50 }],
        awardedRewards: [{ resourceId: "coins", amount: 50 }],
        payoutStatus: "full_per_winner",
      },
    ],
    events: [],
    ...overrides,
  };
}

function createAdapter() {
  return new LottoAnalyticsAdapter({
    async findFinishedByProjectId() {
      return [];
    },
  } as never, () => computedAt);
}

test("uses each saved awarded Lotto payout, excludes removed players, and retains non-winners", () => {
  const game = createFinishedGame();

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact.participants, [
    {
      playerRefId: "player-1",
      nicknameSnapshot: "Winner",
      rewards: {
        regular: [{ resourceId: "coins", amount: 5 }],
        bonus: [],
      },
    },
    {
      playerRefId: "player-2",
      nicknameSnapshot: "Non-winner",
      rewards: {
        regular: [],
        bonus: [],
      },
    },
  ]);
  assert.equal(fact.participants.some((participant) => participant.nicknameSnapshot === "Removed"), false);
});

test("uses updatedAt only as the historical fallback when a finished Lotto game has no finishedAt", () => {
  const game = createFinishedGame({ finishedAt: null });

  const descriptor = createAdapter().describe(game);

  assert.equal(descriptor.occurredOn, "2026-08-25");
  assert.equal(descriptor.occurrenceDateSource, "finalized_at");
  assert.deepEqual(descriptor.source, {
    kind: "game",
    type: "lotto",
    id: game._id.toHexString(),
    titleSnapshot: "Лото",
    revision: null,
    updatedAt: "2026-08-25T10:05:00.000Z",
  });
});

test("publishes unresolved Lotto players as partial facts without matching their nicknames", () => {
  const game = createFinishedGame({
    players: [
      {
        id: "legacy-player-1",
        nickname: "Historical nickname",
        status: "winner_first",
        removedAt: null,
        removedReason: null,
        cardNumbers: [1, 2],
      },
    ],
    payouts: [
      {
        playerId: "legacy-player-1",
        place: 1,
        resolvedRewards: [{ resourceId: "coins", amount: 9 }],
        awardedRewards: [{ resourceId: "coins", amount: 4 }],
        payoutStatus: "split_pool",
      },
    ],
  });

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact.participants, [
    {
      playerRefId: null,
      nicknameSnapshot: "Historical nickname",
      rewards: {
        regular: [{ resourceId: "coins", amount: 4 }],
        bonus: [],
      },
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

test("delegates project-scoped finished-source reads to the Lotto repository", async () => {
  const game = createFinishedGame();
  let requestedProjectId: string | undefined;
  const adapter = new LottoAnalyticsAdapter({
    async findFinishedByProjectId(projectId: string) {
      requestedProjectId = projectId;
      return [game];
    },
  } as never, () => computedAt);

  const sources = await adapter.findFinishedByProjectId("project-1");

  assert.equal(requestedProjectId, "project-1");
  assert.deepEqual(sources, [game]);
});
