import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsProjectionService } from "./AnalyticsProjectionService";
import type { AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import type { AnalyticsSourceAdapter } from "./adapters/AnalyticsSourceAdapter";
import type { AnalyticsFactDocument, AnalyticsSourceStamp } from "./domain/types";
import { AnalyticsProjectionBuildError } from "./errors/AnalyticsProjectionBuildError";
import { AnalyticsRefreshInProgressError } from "./errors/AnalyticsRefreshInProgressError";

interface TestSource {
  id: string;
  updatedAt?: string;
  invalid?: boolean;
}

const freshIntegrity: AnalyticsIntegrityReport = {
  freshness: "fresh",
  sourceCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
  factCountsByType: { journey: 0, battleships: 0, lotto: 0, lotto_bingo: 0, quiz: 0 },
  missing: [],
  orphan: [],
  outdated: [],
  partialFacts: [],
};

function stamp(source: TestSource): AnalyticsSourceStamp {
  return {
    kind: "game",
    type: "journey",
    id: source.id,
    titleSnapshot: "Карта Мародёров",
    revision: null,
    updatedAt: source.updatedAt ?? "2026-08-25T10:00:00.000Z",
  };
}

function toFact(source: TestSource): AnalyticsFactDocument {
  return {
    projectId: "project-a",
    occurredAt: "2026-08-25T09:00:00.000Z",
    source: stamp(source),
    participants: source.invalid
      ? [
          {
            playerRefId: "player-1",
            nicknameSnapshot: "Player",
            rewards: { regular: [{ resourceId: "coins", amount: Number.NaN }], bonus: [] },
          },
        ]
      : [],
    resourceSnapshot: [],
    meta: { status: "ready", issues: [], computedAt: "2026-08-25T10:30:00.000Z", schemaVersion: 2 },
  };
}

function adapter(
  sources: TestSource[],
  options: { onFind?: () => Promise<void>; failBuildFor?: string } = {},
): AnalyticsSourceAdapter<TestSource> {
  return {
    sourceType: "journey",
    async findFinishedByProjectId(projectId: string) {
      assert.equal(projectId, "project-a");
      await options.onFind?.();
      return sources;
    },
    describe(source) {
      return { projectId: "project-a", occurredAt: "2026-08-25T09:00:00.000Z", source: stamp(source) };
    },
    buildFact(source) {
      if (source.id === options.failBuildFor) throw new Error("Corrupt saved source");
      return toFact(source);
    },
  };
}

function createService(
  sourceAdapter: AnalyticsSourceAdapter<TestSource>,
  repositoryOverrides: Record<string, unknown> = {},
  integrity = freshIntegrity,
) {
  const repository = {
    async replaceBySource() {},
    async deleteOrphansForProject() { return 0; },
    ...repositoryOverrides,
  };
  const integrityService = { async inspectProject() { return integrity; } };
  return new AnalyticsProjectionService(repository as never, integrityService as never, [sourceAdapter] as never);
}

test("rebuilds facts before replacing them, then cleans only confirmed orphans and returns integrity", async () => {
  const replaced: AnalyticsFactDocument[] = [];
  let cleanupCall: { projectId: string; keys: ReadonlySet<string> } | undefined;
  const integrity = { ...freshIntegrity, sourceCountsByType: { ...freshIntegrity.sourceCountsByType, journey: 2 } };
  const service = createService(adapter([{ id: "source-1" }, { id: "source-2" }]), {
    async replaceBySource(fact: AnalyticsFactDocument) {
      replaced.push(fact);
    },
    async deleteOrphansForProject(projectId: string, keys: ReadonlySet<string>) {
      cleanupCall = { projectId, keys };
      return 1;
    },
  }, integrity);

  const report = await service.refreshProject("project-a");

  assert.deepEqual(replaced.map((fact) => fact.source.id), ["source-1", "source-2"]);
  assert.equal(cleanupCall?.projectId, "project-a");
  assert.equal(cleanupCall?.keys.size, 2);
  assert.deepEqual(report, { factsBuilt: 2, factsReplaced: 2, orphanFactsDeleted: 1, integrity });
});

test("does not write or clean up any facts when a source cannot be built or validated", async () => {
  let replacements = 0;
  let cleanupCalls = 0;
  const service = createService(adapter([{ id: "source-1" }, { id: "source-2", invalid: true }]), {
    async replaceBySource() {
      replacements += 1;
    },
    async deleteOrphansForProject() {
      cleanupCalls += 1;
      return 0;
    },
  });

  await assert.rejects(service.refreshProject("project-a"), AnalyticsProjectionBuildError);

  assert.equal(replacements, 0);
  assert.equal(cleanupCalls, 0);
});

test("previews validated facts without writing or inspecting the persisted projection", async () => {
  let replacements = 0;
  let integrityInspections = 0;
  const service = new AnalyticsProjectionService(
    {
      async replaceBySource() {
        replacements += 1;
      },
    } as never,
    {
      async inspectProject() {
        integrityInspections += 1;
        return freshIntegrity;
      },
    } as never,
    [adapter([{ id: "source-1" }])] as never,
  );
  const preview = await service.previewProject("project-a");

  assert.equal(preview.factsBuilt, 1);
  assert.deepEqual(preview.facts.map((fact) => fact.source.id), ["source-1"]);
  assert.equal(replacements, 0);
  assert.equal(integrityInspections, 0);
});

test("rejects a concurrent refresh for the same project but releases the project after completion", async () => {
  let releaseFirstRead: (() => void) | undefined;
  let markFirstReadStarted: (() => void) | undefined;
  const firstReadStarted = new Promise<void>((resolve) => {
    markFirstReadStarted = resolve;
  });
  const firstReadCanFinish = new Promise<void>((resolve) => {
    releaseFirstRead = resolve;
  });
  const service = createService(
    adapter([{ id: "source-1" }], {
      async onFind() {
        markFirstReadStarted?.();
        await firstReadCanFinish;
      },
    }),
  );

  const firstRefresh = service.refreshProject("project-a");
  await firstReadStarted;
  await assert.rejects(service.refreshProject("project-a"), AnalyticsRefreshInProgressError);
  releaseFirstRead?.();
  await firstRefresh;

  await service.refreshProject("project-a");
});

test("wraps a failing adapter build in a non-public projection error", async () => {
  const service = createService(adapter([{ id: "bad-source" }], { failBuildFor: "bad-source" }));

  await assert.rejects(service.refreshProject("project-a"), (error: unknown) => {
    assert.ok(error instanceof AnalyticsProjectionBuildError);
    assert.equal(error.code, "analytics_projection_build_failed");
    assert.equal(error.expose, false);
    assert.deepEqual(error.details, { sourceType: "journey", sourceId: "bad-source" });
    return true;
  });
});
