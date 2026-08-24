import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsIntegrityService } from "./AnalyticsIntegrityService";
import type { AnalyticsSourceAdapter } from "./adapters/AnalyticsSourceAdapter";
import type { AnalyticsFactDocument, AnalyticsSourceStamp } from "./domain/types";

interface TestSource {
  descriptor: AnalyticsSourceStamp;
}

function source(id: string, updatedAt = "2026-08-25T10:00:00.000Z"): AnalyticsSourceStamp {
  return { kind: "game", type: "journey", id, revision: null, updatedAt };
}

function fact(sourceStamp: AnalyticsSourceStamp): AnalyticsFactDocument {
  return {
    projectId: "project-a",
    occurredAt: "2026-08-25T09:00:00.000Z",
    source: sourceStamp,
    participants: [],
    resourceSnapshot: [],
    meta: { status: "ready", issues: [], computedAt: "2026-08-25T10:30:00.000Z", schemaVersion: 1 },
  };
}

function adapter(sources: TestSource[]): AnalyticsSourceAdapter<TestSource> {
  return {
    sourceType: "journey",
    async findFinishedByProjectId() {
      return sources;
    },
    describe(value) {
      return { projectId: "project-a", occurredAt: "2026-08-25T09:00:00.000Z", source: value.descriptor };
    },
    buildFact() {
      throw new Error("Not used by integrity inspection");
    },
  };
}

test("separately detects missing, orphan, and outdated facts even when source and fact counts match", async () => {
  const liveSources = [
    { descriptor: source("outdated", "2026-08-25T11:00:00.000Z") },
    { descriptor: source("missing") },
  ];
  const partialFact = fact(source("orphan"));
  partialFact.meta = {
    status: "partial",
    issues: [{ code: "missing_player_reference", nicknameSnapshot: "Historical name" }],
    computedAt: "2026-08-25T10:30:00.000Z",
    schemaVersion: 1,
  };
  const service = new AnalyticsIntegrityService(
    {
      async findByProjectId(projectId: string) {
        assert.equal(projectId, "project-a");
        return [
          { ...fact(source("outdated", "2026-08-25T10:00:00.000Z")), _id: "fact-outdated" },
          { ...partialFact, _id: "fact-orphan" },
        ];
      },
    } as never,
    [adapter(liveSources)] as never,
  );

  const report = await service.inspectProject("project-a");

  assert.equal(report.freshness, "stale");
  assert.deepEqual(report.missing, [source("missing")]);
  assert.deepEqual(report.orphan, [source("orphan")]);
  assert.deepEqual(report.outdated, [{ expected: source("outdated", "2026-08-25T11:00:00.000Z"), actual: source("outdated") }]);
  assert.deepEqual(report.partialFacts, [
    { source: source("orphan"), issues: [{ code: "missing_player_reference", nicknameSnapshot: "Historical name" }] },
  ]);
  assert.deepEqual(report.sourceCountsByType, { journey: 2, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 });
  assert.deepEqual(report.factCountsByType, { journey: 2, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 });
});

test("keeps partial facts fresh when their source stamps match", async () => {
  const partialFact = fact(source("partial"));
  partialFact.meta = {
    status: "partial",
    issues: [{ code: "missing_player_reference", nicknameSnapshot: "Historical name" }],
    computedAt: "2026-08-25T10:30:00.000Z",
    schemaVersion: 1,
  };
  const service = new AnalyticsIntegrityService(
    { async findByProjectId() { return [{ ...partialFact, _id: "fact-partial" }]; } } as never,
    [adapter([{ descriptor: source("partial") }])] as never,
  );

  const report = await service.inspectProject("project-a");

  assert.equal(report.freshness, "fresh");
  assert.equal(report.partialFacts.length, 1);
});
