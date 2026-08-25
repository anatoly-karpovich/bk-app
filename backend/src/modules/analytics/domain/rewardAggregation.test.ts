import assert from "node:assert/strict";
import test from "node:test";
import { aggregateAnalyticsParticipantRewards, aggregateAnalyticsResourceAmounts } from "./rewardAggregation";

test("aggregates saved analytics rewards by resource without mixing regular and bonus categories", () => {
  const result = aggregateAnalyticsParticipantRewards([
    {
      regular: [{ resourceId: "ekr", amount: 2 }],
      bonus: [{ resourceId: "chips", amount: 1 }],
    },
    {
      regular: [{ resourceId: "ekr", amount: 3 }],
      bonus: [{ resourceId: "ekr", amount: 5 }],
    },
  ]);

  assert.deepEqual(result, {
    regular: [{ resourceId: "ekr", amount: 5 }],
    bonus: [
      { resourceId: "chips", amount: 1 },
      { resourceId: "ekr", amount: 5 },
    ],
  });
});

test("aggregates only valid persisted resource amounts", () => {
  assert.deepEqual(
    aggregateAnalyticsResourceAmounts([
      [{ resourceId: "ekr", amount: 10 }],
      [
        { resourceId: "ekr", amount: -4 },
        { resourceId: "", amount: 1 },
      ],
    ]),
    [{ resourceId: "ekr", amount: 6 }],
  );
});
