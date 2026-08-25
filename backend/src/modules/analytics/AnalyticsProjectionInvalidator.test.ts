import assert from "node:assert/strict";
import test from "node:test";
import { BestEffortAnalyticsProjectionInvalidator } from "./AnalyticsProjectionInvalidator";

test("deletes facts through the project-scoped repository methods", async () => {
  const calls: unknown[][] = [];
  const invalidator = new BestEffortAnalyticsProjectionInvalidator({
    async deleteBySourceKey(...args: unknown[]) {
      calls.push(args);
      return true;
    },
    async deleteByProjectId(...args: unknown[]) {
      calls.push(args);
    },
  } as never);

  await invalidator.deleteSourceFact("project-a", { kind: "game", id: "game-a" });
  await invalidator.deleteProjectFacts("project-a");

  assert.deepEqual(calls, [["project-a", "game", "game-a"], ["project-a"]]);
});

test("logs and suppresses an invalidation failure after the canonical mutation", async () => {
  const errors: Array<{ message: string; context: Record<string, unknown> }> = [];
  const invalidator = new BestEffortAnalyticsProjectionInvalidator(
    {
      async deleteBySourceKey() {
        throw new Error("Mongo unavailable");
      },
    } as never,
    { error: (message, context) => errors.push({ message, context }) },
  );

  await invalidator.deleteSourceFact("project-a", { kind: "quiz_event", id: "event-a" });

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.message, "Analytics projection invalidation failed");
  assert.deepEqual(
    { ...errors[0]?.context, error: (errors[0]?.context.error as Error).message },
    {
      operation: "delete_source_fact",
      projectId: "project-a",
      sourceKind: "quiz_event",
      sourceId: "event-a",
      error: "Mongo unavailable",
    },
  );
});
