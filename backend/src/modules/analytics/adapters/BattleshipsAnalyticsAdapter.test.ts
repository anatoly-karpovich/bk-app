import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { BattleshipsGame } from "../../battleships/domain/types";
import { BattleshipsAnalyticsAdapter } from "./BattleshipsAnalyticsAdapter";

const computedAt = "2026-08-25T11:00:00.000Z";

function createFinishedGame(overrides: Partial<BattleshipsGame> = {}): WithId<BattleshipsGame> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e779b8"),
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-25T10:05:00.000Z",
    finishedAt: "2026-08-25T10:00:00.000Z",
    status: "finished",
    playerName: "Saved Player",
    playerRefId: "player-1",
    djName: "DJ",
    projectId: "project-1",
    configId: "config-1",
    configName: "Config",
    resources: [
      { id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 },
      { id: "key", code: "key", name: "Key", label: "keys", type: "item" },
    ],
    rules: { selectedBoardSize: 1, boards: {} },
    board: [],
    ships: [],
    shots: [
      {
        createdAt: "2026-08-25T09:00:00.000Z",
        row: 1,
        column: 1,
        result: "kill",
        rewardGrants: [
          { source: "hit", rewards: [{ resourceId: "coins", amount: 2 }] },
          { source: "destroy_bonus", rewards: [{ resourceId: "key", amount: 1 }] },
        ],
        prizeDelta: [{ resourceId: "coins", amount: 999 }],
        totalPrize: [{ resourceId: "coins", amount: 999 }],
        shipSize: 1,
      },
    ],
    ...overrides,
  };
}

function createAdapter() {
  return new BattleshipsAnalyticsAdapter({
    async findFinishedByProjectId() {
      return [];
    },
  } as never, () => computedAt);
}

test("builds a Battleships fact from saved hit and destroy grants without counting derived prizes", () => {
  const game = createFinishedGame();

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact, {
    projectId: "project-1",
    occurredAt: "2026-08-25T10:00:00.000Z",
    source: {
      kind: "game",
      type: "battleships",
      id: game._id.toHexString(),
      titleSnapshot: "Морской бой",
      revision: null,
      updatedAt: "2026-08-25T10:05:00.000Z",
    },
    participants: [
      {
        playerRefId: "player-1",
        nicknameSnapshot: "Saved Player",
        rewards: {
          regular: [
            { resourceId: "coins", amount: 2 },
            { resourceId: "key", amount: 1 },
          ],
          bonus: [],
        },
      },
    ],
    resourceSnapshot: game.resources,
    meta: {
      status: "ready",
      issues: [],
      computedAt,
      schemaVersion: 2,
    },
  });
});

test("uses updatedAt only as the historical fallback when a finished game has no finishedAt", () => {
  const game = createFinishedGame({ finishedAt: undefined });

  const descriptor = createAdapter().describe(game);

  assert.equal(descriptor.occurredAt, "2026-08-25T10:05:00.000Z");
});

test("publishes a partial fact for a legacy player without a stable reference", () => {
  const game = createFinishedGame({ playerRefId: undefined, playerName: "Historical nickname" });

  const fact = createAdapter().buildFact(game);

  assert.deepEqual(fact.participants[0], {
    playerRefId: null,
    nicknameSnapshot: "Historical nickname",
    rewards: {
      regular: [
        { resourceId: "coins", amount: 2 },
        { resourceId: "key", amount: 1 },
      ],
      bonus: [],
    },
  });
  assert.deepEqual(fact.meta, {
    status: "partial",
    issues: [{ code: "missing_player_reference", nicknameSnapshot: "Historical nickname" }],
    computedAt,
    schemaVersion: 2,
  });
});

test("delegates project-scoped finished-source reads to the Battleships repository", async () => {
  const game = createFinishedGame();
  let requestedProjectId: string | undefined;
  const adapter = new BattleshipsAnalyticsAdapter({
    async findFinishedByProjectId(projectId: string) {
      requestedProjectId = projectId;
      return [game];
    },
  } as never, () => computedAt);

  const sources = await adapter.findFinishedByProjectId("project-1");

  assert.equal(requestedProjectId, "project-1");
  assert.deepEqual(sources, [game]);
});
