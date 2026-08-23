import assert from "node:assert/strict";
import test from "node:test";
import { RewardGrantService, type Randomizer, type ResourceSnapshot } from "../rewards";
import { BattleshipsEngine } from "./BattleshipsEngine";
import type { BattleshipsGame, BattleshipsRules } from "./domain/types";

const resources: ResourceSnapshot[] = [
  { id: "coins", code: "coins", name: "Coins", label: "монет", type: "currency", valueType: "integer", precision: 0 },
  { id: "key", code: "key", name: "Key", label: "ключ", type: "item" },
];
const rules: BattleshipsRules = {
  selectedBoardSize: 2,
  boards: {
    "2": {
      boardSize: 2,
      maxShots: 2,
      ships: [{ size: 1, amount: 1 }],
      rewards: {
        hit: { mode: "all", rewards: [{ resourceId: "coins", amount: 2 }] },
        destroyBonusByShipSize: { 1: { mode: "all", rewards: [{ resourceId: "key", amount: 1 }] } },
      },
    },
  },
};

function game(): BattleshipsGame {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "in_progress",
    playerName: "Player",
    djName: "DJ",
    projectId: "project",
    configId: "config",
    configName: "Config",
    resources,
    rules,
    board: [
      [1, 0],
      [0, 0],
    ],
    ships: [{ size: 1, cells: [{ row: 1, column: 1, isHit: false }] }],
    shots: [],
  };
}

test("resolves hit and destroy pools independently and persists their outcomes", () => {
  const randomizer: Randomizer = { succeeds: () => true, pickWeightedIndex: () => 0 };
  const engine = new BattleshipsEngine(new RewardGrantService(randomizer));
  const next = engine.makeShot(game(), { row: 1, column: 1 });

  assert.equal(next.shots[0].result, "kill");
  assert.deepEqual(next.shots[0].rewardGrants, [
    { source: "hit", rewards: [{ resourceId: "coins", amount: 2 }] },
    { source: "destroy_bonus", rewards: [{ resourceId: "key", amount: 1 }] },
  ]);
  assert.deepEqual(next.shots[0].prizeDelta, [
    { resourceId: "coins", amount: 2 },
    { resourceId: "key", amount: 1 },
  ]);
  assert.deepEqual(next.shots[0].totalPrize, next.shots[0].prizeDelta);
});

test("undo uses persisted reward outcomes without resolving a pool again", () => {
  let resolutions = 0;
  const randomizer: Randomizer = {
    succeeds: () => true,
    pickWeightedIndex: () => {
      resolutions += 1;
      return 0;
    },
  };
  const weightedRules = structuredClone(rules);
  weightedRules.boards["2"].rewards.hit = {
    mode: "weighted_one",
    options: [{ reward: { resourceId: "coins", amount: 2 }, weight: 1 }],
  };
  const engine = new BattleshipsEngine(new RewardGrantService(randomizer));
  const resolved = engine.makeShot({ ...game(), rules: weightedRules }, { row: 1, column: 1 });
  engine.undoLastShot(resolved);

  assert.equal(resolutions, 1);
});

test("stores the resolved Player reference when creating a game", () => {
  const engine = new BattleshipsEngine(new RewardGrantService({ succeeds: () => true, pickWeightedIndex: () => 0 }));
  const created = engine.createGame(
    { nickname: "Player", playerRefId: "player-1" },
    { rules, resources, projectId: "project", configId: "config", configName: "Config" },
  );

  assert.equal(created.playerName, "Player");
  assert.equal(created.playerRefId, "player-1");
});
