import assert from "node:assert/strict";
import test from "node:test";
import { LottoPayoutDistributor } from "./LottoPayoutDistributor";

const resources = [
  {
    id: "coins",
    code: "coins",
    name: "Coins",
    label: "coins",
    type: "currency" as const,
    valueType: "integer" as const,
    precision: 0,
  },
  { id: "key", code: "key", name: "Key", label: "key", type: "item" as const },
];

test("splits currency pools exactly and assigns the indivisible remainder in player order", () => {
  const payouts = new LottoPayoutDistributor().distribute({
    playerIds: ["first", "second"],
    place: 1,
    resolvedRewards: [{ resourceId: "coins", amount: 5 }],
    mode: "split_pool",
    resources,
  });
  assert.deepEqual(
    payouts.map((payout) => payout.awardedRewards),
    [[{ resourceId: "coins", amount: 3 }], [{ resourceId: "coins", amount: 2 }]],
  );
});

test("rejects split pools containing items and duplicates full rewards for every winner", () => {
  const distributor = new LottoPayoutDistributor();
  assert.throws(() =>
    distributor.distribute({
      playerIds: ["first", "second"],
      place: 1,
      resolvedRewards: [{ resourceId: "key", amount: 1 }],
      mode: "split_pool",
      resources,
    }),
  );
  assert.deepEqual(
    distributor
      .distribute({
        playerIds: ["first", "second"],
        place: 1,
        resolvedRewards: [{ resourceId: "key", amount: 1 }],
        mode: "full_per_winner",
        resources,
      })
      .map((payout) => payout.awardedRewards),
    [[{ resourceId: "key", amount: 1 }], [{ resourceId: "key", amount: 1 }]],
  );
});
