import assert from "node:assert/strict";
import test from "node:test";
import { RewardGrantService } from "./RewardGrantService";
import type { Randomizer } from "../domain/randomizer";

function createRandomizer(overrides: Partial<Randomizer> = {}): Randomizer {
  return {
    succeeds: () => false,
    pickWeightedIndex: () => 0,
    ...overrides,
  };
}

test("grants every configured reward from an all pool without mutating its configuration", () => {
  const pool = {
    mode: "all" as const,
    rewards: [{ resourceId: "coins", amount: 5 }],
  };
  const service = new RewardGrantService(createRandomizer());

  const result = service.resolve(pool);
  result[0].amount = 10;

  assert.deepEqual(result, [{ resourceId: "coins", amount: 10 }]);
  assert.deepEqual(pool.rewards, [{ resourceId: "coins", amount: 5 }]);
});

test("grants the randomly selected weighted reward, including an explicitly empty option", () => {
  const pool = {
    mode: "weighted_one" as const,
    options: [
      { reward: { resourceId: "coins", amount: 5 }, weight: 1 },
      { reward: null, weight: 3 },
    ],
  };

  assert.deepEqual(new RewardGrantService(createRandomizer({ pickWeightedIndex: () => 0 })).resolve(pool), [
    { resourceId: "coins", amount: 5 },
  ]);
  assert.deepEqual(new RewardGrantService(createRandomizer({ pickWeightedIndex: () => 1 })).resolve(pool), []);
});

test("grants each independent reward whose chance succeeds", () => {
  const outcomes = [true, false];
  const service = new RewardGrantService(
    createRandomizer({ succeeds: () => outcomes.shift() ?? false }),
  );

  assert.deepEqual(
    service.resolve({
      mode: "independent",
      options: [
        { reward: { resourceId: "coins", amount: 5 }, chanceBps: 5_000 },
        { reward: { resourceId: "key", amount: 1 }, chanceBps: 5_000 },
      ],
    }),
    [{ resourceId: "coins", amount: 5 }],
  );
});
