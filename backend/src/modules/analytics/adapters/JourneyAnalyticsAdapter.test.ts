import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { JourneyGameDocument } from "../../journey/JourneyRepository";
import { JourneyAnalyticsAdapter } from "./JourneyAnalyticsAdapter";

const computedAt = "2026-08-25T13:00:00.000Z";

function createFinishedGame(overrides: Partial<JourneyGameDocument> = {}): WithId<JourneyGameDocument> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e7800a"),
    storageFormat: "v2",
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-25T10:05:00.000Z",
    finishedAt: "2026-08-25T10:00:00.000Z",
    djName: "DJ",
    projectId: "project-1",
    configId: "config-1",
    configName: "Config",
    forumTopicId: null,
    resources: [
      { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 },
      { id: "key", code: "key", name: "Key", label: "keys", type: "item" },
    ],
    rules: {
      initialRewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 50 }] },
      minDice: 1,
      maxDice: 6,
      resourceLimits: [],
      mapSize: 10,
      jackpot: { countMode: "fixed", count: 0, playersPerJackpot: 1, rewardPool: { mode: "all", rewards: [] } },
      cells: [],
      achievements: {
        unlucky: { rewardPool: { mode: "all", rewards: [] } },
        careful: { rewardPool: { mode: "all", rewards: [] } },
        collector: { rewardPool: { mode: "all", rewards: [] } },
        lucky: { rewardPool: { mode: "all", rewards: [] } },
      },
    },
    stateV2: {
      moveIndex: 3,
      status: "finished",
      map: {},
      rounds: [],
      forumLog: [],
      players: [
        {
          id: "winner-1",
          playerRefId: "player-1",
          nickname: "Winner",
          status: "finished",
          removedAt: null,
          removedReason: null,
          position: 11,
          balance: { coins: 59, key: 1 },
          initialRewards: [{ resourceId: "coins", amount: 50 }],
          finalRewards: {
            regular: [{ resourceId: "coins", amount: 2 }],
            bonus: [{ resourceId: "coins", amount: 7 }, { resourceId: "key", amount: 1 }],
            total: [{ resourceId: "coins", amount: 999 }],
          },
          achievementNames: ["Lucky"],
        },
        {
          id: "non-winner-1",
          playerRefId: "player-2",
          nickname: "Non-winner",
          status: "finished",
          removedAt: null,
          removedReason: null,
          position: 11,
          balance: { coins: 50 },
          initialRewards: [{ resourceId: "coins", amount: 50 }],
          finalRewards: { regular: [], bonus: [], total: [] },
          achievementNames: [],
        },
        {
          id: "removed-1",
          playerRefId: "player-3",
          nickname: "Removed",
          status: "removed",
          removedAt: "2026-08-25T09:00:00.000Z",
          removedReason: "manual",
          position: 4,
          balance: { coins: 150 },
          initialRewards: [{ resourceId: "coins", amount: 50 }],
          finalRewards: {
            regular: [{ resourceId: "coins", amount: 100 }],
            bonus: [],
            total: [{ resourceId: "coins", amount: 100 }],
          },
          achievementNames: [],
        },
      ],
    },
    ...overrides,
  };
}

function createAdapter() {
  return new JourneyAnalyticsAdapter({
    async findFinishedByProjectId() {
      return [];
    },
  } as never, () => computedAt);
}

test("uses saved Journey final rewards, excludes initial balance and removed players, and preserves categories", () => {
  const fact = createAdapter().buildFact(createFinishedGame());

  assert.deepEqual(fact.participants, [
    {
      playerRefId: "player-1",
      nicknameSnapshot: "Winner",
      rewards: {
        regular: [{ resourceId: "coins", amount: 2 }],
        bonus: [{ resourceId: "coins", amount: 7 }, { resourceId: "key", amount: 1 }],
      },
    },
    {
      playerRefId: "player-2",
      nicknameSnapshot: "Non-winner",
      rewards: { regular: [], bonus: [] },
    },
  ]);
  assert.equal(fact.participants.some((participant) => participant.nicknameSnapshot === "Removed"), false);
});

test("uses updatedAt only as the historical fallback when a finished Journey game has no finishedAt", () => {
  const game = createFinishedGame({ finishedAt: null });

  const descriptor = createAdapter().describe(game);

  assert.equal(descriptor.occurredAt, "2026-08-25T10:05:00.000Z");
  assert.deepEqual(descriptor.source, {
    kind: "game",
    type: "journey",
    id: game._id.toHexString(),
    revision: null,
    updatedAt: "2026-08-25T10:05:00.000Z",
  });
});

test("publishes unresolved Journey players as partial facts without matching their nicknames", () => {
  const game = createFinishedGame({
    stateV2: {
      ...createFinishedGame().stateV2,
      players: [
        {
          id: "legacy-player-1",
          nickname: "Historical nickname",
          status: "finished",
          removedAt: null,
          removedReason: null,
          position: 11,
          balance: { coins: 9 },
          initialRewards: [{ resourceId: "coins", amount: 50 }],
          finalRewards: {
            regular: [{ resourceId: "coins", amount: 4 }],
            bonus: [{ resourceId: "coins", amount: 5 }],
            total: [{ resourceId: "coins", amount: 9 }],
          },
          achievementNames: [],
        },
      ],
    },
  });

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact.participants, [
    {
      playerRefId: null,
      nicknameSnapshot: "Historical nickname",
      rewards: {
        regular: [{ resourceId: "coins", amount: 4 }],
        bonus: [{ resourceId: "coins", amount: 5 }],
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
    schemaVersion: 1,
  });
});

test("rejects a finished Journey player without a final reward snapshot", () => {
  const game = createFinishedGame();
  game.stateV2.players[0].finalRewards = null;

  assert.throws(() => createAdapter().buildFact(game), /missing final rewards/);
});

test("delegates project-scoped finished-source reads to the Journey repository", async () => {
  const game = createFinishedGame();
  let requestedProjectId: string | undefined;
  const adapter = new JourneyAnalyticsAdapter({
    async findFinishedByProjectId(projectId: string) {
      requestedProjectId = projectId;
      return [game];
    },
  } as never, () => computedAt);

  const sources = await adapter.findFinishedByProjectId("project-1");

  assert.equal(requestedProjectId, "project-1");
  assert.deepEqual(sources, [game]);
});
