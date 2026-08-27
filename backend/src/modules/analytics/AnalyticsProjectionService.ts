import type { ResourceAmount } from "../rewards";
import { AnalyticsIntegrityService, type AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import { AnalyticsProjectRefreshMutex } from "./AnalyticsProjectRefreshMutex";
import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import type { AnalyticsSourceAdapter } from "./adapters/AnalyticsSourceAdapter";
import { ANALYTICS_OCCURRENCE_DATE_SOURCES, isAnalyticsCalendarDate } from "./domain/occurrenceDate";
import { createAnalyticsSourceKey, isAnalyticsSourcePair } from "./domain/sourceTypes";
import type { AnalyticsFactDocument, AnalyticsSourceStamp } from "./domain/types";
import { AnalyticsProjectionBuildError } from "./errors/AnalyticsProjectionBuildError";

export interface AnalyticsRefreshReport {
  factsBuilt: number;
  factsReplaced: number;
  orphanFactsDeleted: number;
  integrity: AnalyticsIntegrityReport;
}

/** Internal read-only result used by controlled backfill preflight tooling. */
export interface AnalyticsProjectionPreviewReport {
  factsBuilt: number;
  facts: ReadonlyArray<AnalyticsFactDocument>;
}

type AnalyticsAdapterPort = AnalyticsSourceAdapter<unknown>;

/** Rebuilds one project's facts from canonical completed sources. */
export class AnalyticsProjectionService {
  constructor(
    private readonly projectionRepository: AnalyticsProjectionRepository,
    private readonly integrityService: AnalyticsIntegrityService,
    private readonly adapters: ReadonlyArray<AnalyticsAdapterPort>,
    private readonly refreshMutex = new AnalyticsProjectRefreshMutex(),
  ) {}

  async refreshProject(projectId: string): Promise<AnalyticsRefreshReport> {
    return this.refreshMutex.runExclusive(projectId, async () => {
      const facts = await this.buildFacts(projectId);
      await Promise.all(facts.map((fact) => this.projectionRepository.replaceBySource(fact)));

      const orphanFactsDeleted = await this.projectionRepository.deleteOrphansForProject(
        projectId,
        new Set(facts.map((fact) => this.factKey(fact))),
      );

      return {
        factsBuilt: facts.length,
        factsReplaced: facts.length,
        orphanFactsDeleted,
        integrity: await this.integrityService.inspectProject(projectId),
      };
    });
  }

  /** Replaces one already-persisted completed source without refreshing the rest of its project. */
  async submitSource<TSource>(adapter: AnalyticsSourceAdapter<TSource>, source: TSource): Promise<void> {
    const descriptor = adapter.describe(source);
    const fact = this.buildFact(adapter, source, descriptor.projectId);
    await this.projectionRepository.replaceBySource(fact);
  }

  /** Builds and validates a project's facts without reading or writing the projection collection. */
  async previewProject(projectId: string): Promise<AnalyticsProjectionPreviewReport> {
    return this.refreshMutex.runExclusive(projectId, async () => {
      const facts = await this.buildFacts(projectId);
      return { factsBuilt: facts.length, facts };
    });
  }

  private async buildFacts(projectId: string): Promise<AnalyticsFactDocument[]> {
    const factsByAdapter = await Promise.all(
      this.adapters.map(async (adapter) => {
        const sources = await adapter.findFinishedByProjectId(projectId);
        return sources.map((source) => this.buildFact(adapter, source, projectId));
      }),
    );
    const facts = factsByAdapter.flat();
    const seenSourceKeys = new Set<string>();

    for (const fact of facts) {
      const key = this.factKey(fact);
      if (seenSourceKeys.has(key)) {
        throw new AnalyticsProjectionBuildError(fact.source.type, fact.source.id, new Error("Duplicate analytics source key"));
      }
      seenSourceKeys.add(key);
    }

    return facts;
  }

  private buildFact(adapter: AnalyticsAdapterPort, source: unknown, projectId: string): AnalyticsFactDocument {
    let sourceId: string | undefined;
    let sourceType: AnalyticsSourceStamp["type"] = adapter.sourceTypes[0];
    try {
      const descriptor = adapter.describe(source);
      sourceId = descriptor.source.id;
      sourceType = descriptor.source.type;
      const fact = adapter.buildFact(source);
      this.assertValidFact(fact, adapter.sourceTypes, projectId, descriptor.source);
      return fact;
    } catch (error) {
      if (error instanceof AnalyticsProjectionBuildError) throw error;
      throw new AnalyticsProjectionBuildError(sourceType, sourceId, error);
    }
  }

  private assertValidFact(
    fact: AnalyticsFactDocument,
    adapterSourceTypes: ReadonlyArray<AnalyticsSourceStamp["type"]>,
    projectId: string,
    expectedSource: AnalyticsSourceStamp,
  ): void {
    if (fact.projectId !== projectId || !this.isNonEmptyString(fact.projectId)) {
      throw new Error("Analytics fact project does not match refresh project");
    }
    if (
      !isAnalyticsCalendarDate(fact.occurredOn) ||
      !fact.occurrenceDateSource ||
      !ANALYTICS_OCCURRENCE_DATE_SOURCES.includes(fact.occurrenceDateSource) ||
      !this.isValidSourceStamp(fact.source)
    ) {
      throw new Error("Analytics fact has an invalid occurrence date or source stamp");
    }
    if (!adapterSourceTypes.includes(fact.source.type) || !this.sameSourceStamp(fact.source, expectedSource)) {
      throw new Error("Analytics fact source does not match its canonical source descriptor");
    }
    if (fact.meta.schemaVersion !== 3 || (fact.meta.status !== "ready" && fact.meta.status !== "partial")) {
      throw new Error("Analytics fact has unsupported metadata");
    }
    if ((fact.meta.status === "partial") !== (fact.meta.issues.length > 0)) {
      throw new Error("Analytics fact partial status does not match issues");
    }
    if (new Set(fact.participants.filter((participant) => participant.playerRefId).map((participant) => participant.playerRefId)).size !==
      fact.participants.filter((participant) => participant.playerRefId).length) {
      throw new Error("Analytics fact has duplicate resolved participants");
    }
    const unresolvedParticipants = fact.participants.filter((participant) => participant.playerRefId === null);
    if (unresolvedParticipants.length !== fact.meta.issues.length) {
      throw new Error("Analytics fact unresolved participants do not match issues");
    }
    for (const participant of fact.participants) {
      if (!this.isNonEmptyString(participant.nicknameSnapshot)) {
        throw new Error("Analytics fact participant nickname is invalid");
      }
      this.assertValidResourceAmounts(participant.rewards.regular);
      this.assertValidResourceAmounts(participant.rewards.bonus);
    }
  }

  private isValidSourceStamp(source: AnalyticsSourceStamp): boolean {
    return (
      isAnalyticsSourcePair(source.kind, source.type) &&
      this.isNonEmptyString(source.id) &&
      this.isNonEmptyString(source.titleSnapshot) &&
      this.isValidDateTime(source.updatedAt) &&
      (source.revision === null || (Number.isSafeInteger(source.revision) && source.revision >= 0)) &&
      (source.kind === "quiz_event" ? this.isNonEmptyString(source.quizId) : source.quizId === undefined)
    );
  }

  private assertValidResourceAmounts(amounts: ReadonlyArray<ResourceAmount>): void {
    const resourceIds = new Set<string>();
    for (const resourceAmount of amounts) {
      if (
        !this.isNonEmptyString(resourceAmount.resourceId) ||
        !Number.isFinite(resourceAmount.amount) ||
        resourceIds.has(resourceAmount.resourceId)
      ) {
        throw new Error("Analytics fact has an invalid resource amount");
      }
      resourceIds.add(resourceAmount.resourceId);
    }
  }

  private factKey(fact: AnalyticsFactDocument): string {
    return createAnalyticsSourceKey({ projectId: fact.projectId, kind: fact.source.kind, sourceId: fact.source.id });
  }

  private sameSourceStamp(left: AnalyticsSourceStamp, right: AnalyticsSourceStamp): boolean {
    return (
      left.kind === right.kind &&
      left.type === right.type &&
      left.id === right.id &&
      left.titleSnapshot === right.titleSnapshot &&
      left.quizId === right.quizId &&
      left.revision === right.revision &&
      left.updatedAt === right.updatedAt
    );
  }

  private isValidDateTime(value: string): boolean {
    return this.isNonEmptyString(value) && Number.isFinite(Date.parse(value));
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
