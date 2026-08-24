import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import { createAnalyticsSourceKey } from "./domain/sourceTypes";
import type { AnalyticsFactDocument } from "./domain/types";

function createFact(overrides: Partial<AnalyticsFactDocument> = {}): AnalyticsFactDocument {
  return {
    projectId: "project-a",
    occurredAt: "2026-08-25T10:00:00.000Z",
    source: {
      kind: "game",
      type: "journey",
      id: "source-a",
      revision: null,
      updatedAt: "2026-08-25T10:00:00.000Z",
    },
    participants: [],
    resourceSnapshot: [],
    meta: {
      status: "ready",
      issues: [],
      computedAt: "2026-08-25T10:01:00.000Z",
      schemaVersion: 1,
    },
    ...overrides,
  };
}

test("replaces a complete fact using a project-scoped source key", async () => {
  let replaceCall: unknown;
  const fact = createFact();
  const repository = new AnalyticsProjectionRepository({
    async getCollection() {
      return {
        async replaceOne(...args: unknown[]) {
          replaceCall = args;
        },
      };
    },
  } as never);

  await repository.replaceBySource(fact);

  assert.deepEqual(replaceCall, [
    { projectId: "project-a", "source.kind": "game", "source.id": "source-a" },
    fact,
    { upsert: true },
  ]);
});

test("keeps orphan cleanup within one project and removes only confirmed orphan ids", async () => {
  let deleteFilter: unknown;
  const repository = new AnalyticsProjectionRepository({
    async getCollection() {
      return {
        find(filter: unknown) {
          assert.deepEqual(filter, { projectId: "project-a" });
          return {
            async toArray() {
              return [
                { _id: "live-id", projectId: "project-a", source: { kind: "game", id: "source-a" } },
                { _id: "orphan-id", projectId: "project-a", source: { kind: "quiz_event", id: "source-b" } },
              ];
            },
          };
        },
        async deleteMany(filter: unknown) {
          deleteFilter = filter;
          return { deletedCount: 1 };
        },
      };
    },
  } as never);

  const deleted = await repository.deleteOrphansForProject(
    "project-a",
    new Set([createAnalyticsSourceKey({ projectId: "project-a", kind: "game", sourceId: "source-a" })]),
  );

  assert.equal(deleted, 1);
  assert.deepEqual(deleteFilter, { projectId: "project-a", _id: { $in: ["orphan-id"] } });
});

test("prepends the project scope to aggregation pipelines", async () => {
  let aggregatePipeline: unknown;
  const repository = new AnalyticsProjectionRepository({
    async getCollection() {
      return {
        aggregate(pipeline: unknown) {
          aggregatePipeline = pipeline;
          return { async toArray() { return []; } };
        },
      };
    },
  } as never);

  await repository.aggregateProject("project-a", [{ $match: { "source.type": "journey" } }]);

  assert.deepEqual(aggregatePipeline, [{ $match: { projectId: "project-a" } }, { $match: { "source.type": "journey" } }]);
});
