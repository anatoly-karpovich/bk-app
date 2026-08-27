import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type WithId } from "mongodb";
import type { ActivityResultDocument } from "../../activities/domain/types";
import { ActivityResultAnalyticsAdapter } from "./ActivityResultAnalyticsAdapter";

function completedActivity(overrides: Partial<ActivityResultDocument> = {}): WithId<ActivityResultDocument> {
  return {
    _id: new ObjectId("66cb0df7c727752c07e779ba"),
    projectId: "project-1",
    type: "lotto",
    title: "Лото 2024",
    conductedOn: null,
    status: "completed",
    participants: [
      {
        playerRefId: "player-1",
        nicknameSnapshot: "Alice",
        rewards: {
          regular: [{ resourceId: "coins", amount: 10 }],
          bonus: [{ resourceId: "key", amount: 1 }],
        },
      },
    ],
    resourceSnapshot: [
      { id: "coins", code: "coins", name: "Coins", label: "Coins", type: "currency", valueType: "integer", precision: 0 },
      { id: "key", code: "key", name: "Key", label: "Key", type: "item" },
    ],
    hostUserId: "host-1",
    hostSnapshot: { userId: "host-1", displayName: "Host", nickname: "Host" },
    revision: 4,
    completedAt: "2024-02-05T18:00:00.000Z",
    createdAt: "2024-02-05T17:00:00.000Z",
    updatedAt: "2024-02-05T18:00:00.000Z",
    schemaVersion: 1,
    ...overrides,
  };
}

function createAdapter() {
  return new ActivityResultAnalyticsAdapter({ async findCompletedByProjectId() { return []; } } as never, () => "2026-08-27T12:00:00.000Z");
}

test("copies saved manual rewards, snapshots, title, revision, and finalization date into an Activity fact", () => {
  const fact = createAdapter().buildFact(completedActivity());

  assert.equal(fact.occurredOn, "2024-02-05");
  assert.equal(fact.occurrenceDateSource, "finalized_at");
  assert.deepEqual(fact.source, {
    kind: "activity",
    type: "lotto",
    id: "66cb0df7c727752c07e779ba",
    titleSnapshot: "Лото 2024",
    revision: 4,
    updatedAt: "2024-02-05T18:00:00.000Z",
  });
  assert.deepEqual(fact.participants, completedActivity().participants);
  assert.deepEqual(fact.resourceSnapshot, completedActivity().resourceSnapshot);
});

test("prefers the explicit manual conducted date", () => {
  const fact = createAdapter().buildFact(completedActivity({ conductedOn: "2024-01-31" }));

  assert.equal(fact.occurredOn, "2024-01-31");
  assert.equal(fact.occurrenceDateSource, "conducted_on");
});
