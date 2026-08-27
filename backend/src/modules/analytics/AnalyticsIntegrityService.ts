import { ANALYTICS_SOURCE_TYPES, createAnalyticsSourceKey, type AnalyticsSourceType } from "./domain/sourceTypes";
import type { AnalyticsFactIssue, AnalyticsSourceStamp } from "./domain/types";
import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import type { AnalyticsSourceAdapter } from "./adapters/AnalyticsSourceAdapter";

export interface AnalyticsIntegrityReport {
  freshness: "fresh" | "stale";
  sourceCountsByType: Record<AnalyticsSourceType, number>;
  factCountsByType: Record<AnalyticsSourceType, number>;
  missing: AnalyticsSourceStamp[];
  orphan: AnalyticsSourceStamp[];
  outdated: Array<{ expected: AnalyticsSourceStamp; actual: AnalyticsSourceStamp }>;
  partialFacts: Array<{ source: AnalyticsSourceStamp; issues: AnalyticsFactIssue[] }>;
}

type AnalyticsAdapterPort = AnalyticsSourceAdapter<unknown>;

/** Compares canonical final-source stamps to the stored project projection. */
export class AnalyticsIntegrityService {
  constructor(
    private readonly projectionRepository: AnalyticsProjectionRepository,
    private readonly adapters: ReadonlyArray<AnalyticsAdapterPort>,
  ) {}

  async inspectProject(projectId: string): Promise<AnalyticsIntegrityReport> {
    const sourceDescriptorsByAdapter = await Promise.all(
      this.adapters.map(async (adapter) => {
        const sources = await adapter.findFinishedByProjectId(projectId);
        return sources.map((source) => adapter.describe(source));
      }),
    );
    const sourceDescriptors = sourceDescriptorsByAdapter.flat();
    const facts = await this.projectionRepository.findByProjectId(projectId);
    const expectedByKey = new Map(
      sourceDescriptors.map((descriptor) => [this.sourceKey(projectId, descriptor.source), descriptor.source]),
    );
    const actualByKey = new Map(
      facts.map((fact) => [this.sourceKey(projectId, fact.source), fact]),
    );
    const missing: AnalyticsSourceStamp[] = [];
    const outdated: AnalyticsIntegrityReport["outdated"] = [];
    const orphan: AnalyticsSourceStamp[] = [];

    for (const [key, expected] of expectedByKey) {
      const actual = actualByKey.get(key);
      if (!actual) {
        missing.push(expected);
      } else if (!this.sameStamp(expected, actual.source)) {
        outdated.push({ expected, actual: actual.source });
      }
    }

    for (const [key, fact] of actualByKey) {
      if (!expectedByKey.has(key)) orphan.push(fact.source);
    }

    const partialFacts = facts
      .filter((fact) => fact.meta.status === "partial")
      .map((fact) => ({ source: fact.source, issues: fact.meta.issues }));

    return {
      freshness: missing.length || orphan.length || outdated.length ? "stale" : "fresh",
      sourceCountsByType: this.countByType(sourceDescriptors.map((descriptor) => descriptor.source.type)),
      factCountsByType: this.countByType(facts.map((fact) => fact.source.type)),
      missing,
      orphan,
      outdated,
      partialFacts,
    };
  }

  private sourceKey(projectId: string, source: Pick<AnalyticsSourceStamp, "kind" | "id">): string {
    return createAnalyticsSourceKey({ projectId, kind: source.kind, sourceId: source.id });
  }

  private sameStamp(expected: AnalyticsSourceStamp, actual: AnalyticsSourceStamp): boolean {
    return (
      expected.kind === actual.kind &&
      expected.type === actual.type &&
      expected.id === actual.id &&
      expected.titleSnapshot === actual.titleSnapshot &&
      expected.quizId === actual.quizId &&
      expected.revision === actual.revision &&
      expected.updatedAt === actual.updatedAt
    );
  }

  private countByType(types: ReadonlyArray<AnalyticsSourceType>): Record<AnalyticsSourceType, number> {
    return Object.fromEntries(
      ANALYTICS_SOURCE_TYPES.map((type) => [type, types.filter((value) => value === type).length]),
    ) as Record<AnalyticsSourceType, number>;
  }
}
