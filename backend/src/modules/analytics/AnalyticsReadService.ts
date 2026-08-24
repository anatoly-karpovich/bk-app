import type { ResourceSnapshot } from "../rewards";
import { ProjectNotFoundError } from "../projects/errors/ProjectNotFoundError";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import type { ProjectResource } from "../projects/domain/types";
import { AnalyticsIntegrityService, type AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import { ANALYTICS_SOURCE_TYPES, type AnalyticsSourceType } from "./domain/sourceTypes";
import type { AnalyticsFactDocument } from "./domain/types";
import { AnalyticsInvalidQueryError } from "./errors/AnalyticsInvalidQueryError";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

export interface AnalyticsReadQuery {
  from?: string;
  to?: string;
  sourceTypes?: ReadonlyArray<AnalyticsSourceType>;
}

export interface AnalyticsPlayerLeaderboardQuery extends AnalyticsReadQuery {
  resourceId?: string;
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface AnalyticsReadPeriod {
  from: string;
  to: string;
  sourceTypes: AnalyticsSourceType[];
}

export interface AnalyticsRewardTotals {
  regular: number;
  bonus: number;
  total: number;
}

export interface AnalyticsOverviewReadModel {
  period: AnalyticsReadPeriod;
  conductedSources: number;
  participations: number;
  uniqueResolvedPlayers: number;
  rewardsByResource: Array<{ resourceId: string; rewards: AnalyticsRewardTotals }>;
  sourceBreakdown: Record<AnalyticsSourceType, { conductedSources: number; participations: number }>;
  activityByDay: Array<{ date: string; conductedSources: number; participations: number }>;
  integrity: AnalyticsIntegrityReport;
}

export type AnalyticsResourceCatalogStatus = "current" | "historical";

export interface AnalyticsResourceReadModel {
  resource: ResourceSnapshot;
  catalogStatus: AnalyticsResourceCatalogStatus;
  rewards: AnalyticsRewardTotals;
}

export interface AnalyticsResourcesReadModel {
  period: AnalyticsReadPeriod;
  resources: AnalyticsResourceReadModel[];
  integrity: AnalyticsIntegrityReport;
}

export interface AnalyticsPlayerLeaderboardReadModel {
  period: AnalyticsReadPeriod;
  resource: { resource: ResourceSnapshot; catalogStatus: AnalyticsResourceCatalogStatus };
  players: Array<{
    playerRefId: string;
    nicknameSnapshot: string;
    participations: number;
    rewards: AnalyticsRewardTotals;
  }>;
  nextCursor: string | null;
  integrity: AnalyticsIntegrityReport;
}

interface NormalizedReadQuery extends AnalyticsReadPeriod {}

interface PlayerAggregate {
  playerRefId: string;
  nicknameSnapshot: string;
  newestOccurredAt: string;
  participations: number;
  regular: number;
  bonus: number;
}

interface DecodedCursor {
  score: number;
  playerRefId: string;
}

/** Builds query-ready analytics read models only from project-scoped materialized facts. */
export class AnalyticsReadService {
  constructor(
    private readonly projectionRepository: AnalyticsProjectionRepository,
    private readonly integrityService: AnalyticsIntegrityService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getOverview(projectId: string, query: AnalyticsReadQuery = {}): Promise<AnalyticsOverviewReadModel> {
    const normalizedQuery = this.normalizeQuery(query);
    const [facts, integrity] = await Promise.all([
      this.projectionRepository.findByProjectId(projectId),
      this.integrityService.inspectProject(projectId),
    ]);
    const filteredFacts = this.filterFacts(facts, normalizedQuery);
    const sourceBreakdown = this.emptySourceBreakdown();
    const rewardsByResource = new Map<string, AnalyticsRewardTotals>();
    const activityByDay = new Map<string, { conductedSources: number; participations: number }>();
    const resolvedPlayerIds = new Set<string>();
    let participations = 0;

    for (const fact of filteredFacts) {
      const breakdown = sourceBreakdown[fact.source.type];
      breakdown.conductedSources += 1;
      breakdown.participations += fact.participants.length;
      participations += fact.participants.length;
      const date = new Date(fact.occurredAt).toISOString().slice(0, 10);
      const activity = activityByDay.get(date) ?? { conductedSources: 0, participations: 0 };
      activity.conductedSources += 1;
      activity.participations += fact.participants.length;
      activityByDay.set(date, activity);

      for (const participant of fact.participants) {
        if (participant.playerRefId) resolvedPlayerIds.add(participant.playerRefId);
        this.addRewardsByResource(rewardsByResource, participant.rewards.regular, "regular");
        this.addRewardsByResource(rewardsByResource, participant.rewards.bonus, "bonus");
      }
    }

    return {
      period: normalizedQuery,
      conductedSources: filteredFacts.length,
      participations,
      uniqueResolvedPlayers: resolvedPlayerIds.size,
      rewardsByResource: this.toSortedResourceTotals(rewardsByResource),
      sourceBreakdown,
      activityByDay: Array.from(activityByDay.entries())
        .map(([date, activity]) => ({ date, ...activity }))
        .sort((left, right) => left.date.localeCompare(right.date)),
      integrity,
    };
  }

  async getResources(projectId: string, query: AnalyticsReadQuery = {}): Promise<AnalyticsResourcesReadModel> {
    const normalizedQuery = this.normalizeQuery(query);
    const [project, facts, integrity] = await Promise.all([
      this.getProjectOrThrow(projectId),
      this.projectionRepository.findByProjectId(projectId),
      this.integrityService.inspectProject(projectId),
    ]);
    const filteredFacts = this.filterFacts(facts, normalizedQuery);
    const rewardsByResource = this.collectRewardsByResource(filteredFacts);
    const resourceCatalog = this.collectResourceCatalog(project.resources, facts);

    return {
      period: normalizedQuery,
      resources: resourceCatalog.map((resource) => ({
        ...resource,
        rewards: rewardsByResource.get(resource.resource.id) ?? this.emptyRewardTotals(),
      })),
      integrity,
    };
  }

  async getPlayerLeaderboard(
    projectId: string,
    query: AnalyticsPlayerLeaderboardQuery = {},
  ): Promise<AnalyticsPlayerLeaderboardReadModel> {
    const normalizedQuery = this.normalizeQuery(query);
    const [project, facts, integrity] = await Promise.all([
      this.getProjectOrThrow(projectId),
      this.projectionRepository.findByProjectId(projectId),
      this.integrityService.inspectProject(projectId),
    ]);
    const resourceCatalog = this.collectResourceCatalog(project.resources, facts);
    const selectedResource = this.selectResource(resourceCatalog, query.resourceId);
    const aggregates = this.collectPlayerAggregates(this.filterFacts(facts, normalizedQuery), selectedResource.resource.id);
    const search = this.normalizeSearch(query.search);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const limit = this.normalizePageLimit(query.limit);
    const orderedPlayers = Array.from(aggregates.values())
      .filter((player) => !search || player.nicknameSnapshot.toLocaleLowerCase("ru").includes(search))
      .sort((left, right) => right.regular + right.bonus - (left.regular + left.bonus) || left.playerRefId.localeCompare(right.playerRefId));
    const afterCursor = cursor ? orderedPlayers.filter((player) => this.isAfterCursor(player, cursor)) : orderedPlayers;
    const page = afterCursor.slice(0, limit);
    const nextPlayer = afterCursor[limit];

    return {
      period: normalizedQuery,
      resource: selectedResource,
      players: page.map((player) => ({
        playerRefId: player.playerRefId,
        nicknameSnapshot: player.nicknameSnapshot,
        participations: player.participations,
        rewards: this.toRewardTotals(player.regular, player.bonus),
      })),
      nextCursor: nextPlayer ? this.encodeCursor(page.at(-1)!) : null,
      integrity,
    };
  }

  private normalizeQuery(query: AnalyticsReadQuery): NormalizedReadQuery {
    const now = this.now();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const from = this.parseDateTime(query.from ?? defaultFrom.toISOString(), "from");
    const to = this.parseDateTime(query.to ?? defaultTo.toISOString(), "to");
    if (from >= to) throw new AnalyticsInvalidQueryError("from_must_be_before_to");

    const sourceTypes = query.sourceTypes ? [...query.sourceTypes] : [...ANALYTICS_SOURCE_TYPES];
    if (
      sourceTypes.length === 0 ||
      sourceTypes.some((sourceType) => !ANALYTICS_SOURCE_TYPES.includes(sourceType)) ||
      new Set(sourceTypes).size !== sourceTypes.length
    ) {
      throw new AnalyticsInvalidQueryError("invalid_source_types");
    }

    return { from: from.toISOString(), to: to.toISOString(), sourceTypes };
  }

  private filterFacts<T extends AnalyticsFactDocument>(facts: ReadonlyArray<T>, query: NormalizedReadQuery): T[] {
    const sourceTypes = new Set(query.sourceTypes);
    return facts.filter((fact) => {
      const occurredAt = fact.occurredAt;
      return occurredAt >= query.from && occurredAt < query.to && sourceTypes.has(fact.source.type);
    });
  }

  private async getProjectOrThrow(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);
    return project;
  }

  private collectRewardsByResource(facts: ReadonlyArray<AnalyticsFactDocument>): Map<string, AnalyticsRewardTotals> {
    const rewards = new Map<string, AnalyticsRewardTotals>();
    for (const fact of facts) {
      for (const participant of fact.participants) {
        this.addRewardsByResource(rewards, participant.rewards.regular, "regular");
        this.addRewardsByResource(rewards, participant.rewards.bonus, "bonus");
      }
    }
    return rewards;
  }

  private addRewardsByResource(
    target: Map<string, AnalyticsRewardTotals>,
    amounts: ReadonlyArray<{ resourceId: string; amount: number }>,
    category: "regular" | "bonus",
  ): void {
    for (const amount of amounts) {
      const totals = target.get(amount.resourceId) ?? this.emptyRewardTotals();
      totals[category] += amount.amount;
      totals.total += amount.amount;
      target.set(amount.resourceId, totals);
    }
  }

  private collectResourceCatalog(
    currentResources: ReadonlyArray<ProjectResource>,
    facts: ReadonlyArray<AnalyticsFactDocument>,
  ): Array<{ resource: ResourceSnapshot; catalogStatus: AnalyticsResourceCatalogStatus }> {
    const currentById = new Map(currentResources.map((resource) => [resource.id, resource]));
    const historicalById = new Map<string, ResourceSnapshot>();
    for (const fact of [...facts].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))) {
      for (const resource of fact.resourceSnapshot) {
        if (!currentById.has(resource.id) && !historicalById.has(resource.id)) {
          historicalById.set(resource.id, { ...resource });
        }
      }
    }

    return [
      ...currentResources.map((resource) => ({ resource: { ...resource }, catalogStatus: "current" as const })),
      ...Array.from(historicalById.values()).map((resource) => ({ resource, catalogStatus: "historical" as const })),
    ];
  }

  private selectResource(
    resources: ReadonlyArray<{ resource: ResourceSnapshot; catalogStatus: AnalyticsResourceCatalogStatus }>,
    resourceId: string | undefined,
  ): { resource: ResourceSnapshot; catalogStatus: AnalyticsResourceCatalogStatus } {
    if (resourceId) {
      const selected = resources.find((entry) => entry.resource.id === resourceId);
      if (!selected) throw new AnalyticsInvalidQueryError("unknown_resource_id");
      return selected;
    }

    const defaultResource = resources.find((entry) => entry.catalogStatus === "current" && entry.resource.type === "currency");
    if (!defaultResource) throw new AnalyticsInvalidQueryError("resource_id_is_required_without_current_currency");
    return defaultResource;
  }

  private collectPlayerAggregates(
    facts: ReadonlyArray<AnalyticsFactDocument>,
    resourceId: string,
  ): Map<string, PlayerAggregate> {
    const players = new Map<string, PlayerAggregate>();
    for (const fact of facts) {
      for (const participant of fact.participants) {
        if (!participant.playerRefId) continue;
        const current = players.get(participant.playerRefId) ?? {
          playerRefId: participant.playerRefId,
          nicknameSnapshot: participant.nicknameSnapshot,
          newestOccurredAt: fact.occurredAt,
          participations: 0,
          regular: 0,
          bonus: 0,
        };
        current.participations += 1;
        current.regular += this.amountForResource(participant.rewards.regular, resourceId);
        current.bonus += this.amountForResource(participant.rewards.bonus, resourceId);
        if (fact.occurredAt > current.newestOccurredAt) {
          current.nicknameSnapshot = participant.nicknameSnapshot;
          current.newestOccurredAt = fact.occurredAt;
        }
        players.set(participant.playerRefId, current);
      }
    }
    return players;
  }

  private amountForResource(amounts: ReadonlyArray<{ resourceId: string; amount: number }>, resourceId: string): number {
    return amounts.reduce((total, amount) => total + (amount.resourceId === resourceId ? amount.amount : 0), 0);
  }

  private normalizeSearch(search: string | undefined): string | undefined {
    if (search === undefined) return undefined;
    const normalized = search.trim().toLocaleLowerCase("ru");
    if (normalized.length > 100) throw new AnalyticsInvalidQueryError("search_is_too_long");
    return normalized || undefined;
  }

  private normalizePageLimit(limit: number | undefined): number {
    if (limit === undefined) return DEFAULT_PAGE_LIMIT;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
      throw new AnalyticsInvalidQueryError("invalid_limit");
    }
    return limit;
  }

  private encodeCursor(player: PlayerAggregate): string {
    return Buffer.from(JSON.stringify({ score: player.regular + player.bonus, playerRefId: player.playerRefId })).toString("base64url");
  }

  private decodeCursor(cursor: string): DecodedCursor {
    try {
      const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (
        !value ||
        typeof value !== "object" ||
        !Number.isFinite((value as DecodedCursor).score) ||
        typeof (value as DecodedCursor).playerRefId !== "string" ||
        !(value as DecodedCursor).playerRefId
      ) {
        throw new Error("Invalid cursor shape");
      }
      return value as DecodedCursor;
    } catch {
      throw new AnalyticsInvalidQueryError("invalid_cursor");
    }
  }

  private isAfterCursor(player: PlayerAggregate, cursor: DecodedCursor): boolean {
    const score = player.regular + player.bonus;
    return score < cursor.score || (score === cursor.score && player.playerRefId > cursor.playerRefId);
  }

  private toSortedResourceTotals(rewardsByResource: ReadonlyMap<string, AnalyticsRewardTotals>) {
    return Array.from(rewardsByResource.entries())
      .map(([resourceId, rewards]) => ({ resourceId, rewards }))
      .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
  }

  private toRewardTotals(regular: number, bonus: number): AnalyticsRewardTotals {
    return { regular, bonus, total: regular + bonus };
  }

  private emptyRewardTotals(): AnalyticsRewardTotals {
    return { regular: 0, bonus: 0, total: 0 };
  }

  private emptySourceBreakdown(): AnalyticsOverviewReadModel["sourceBreakdown"] {
    return {
      journey: { conductedSources: 0, participations: 0 },
      battleships: { conductedSources: 0, participations: 0 },
      lotto: { conductedSources: 0, participations: 0 },
      lotto_bingo: { conductedSources: 0, participations: 0 },
      quiz: { conductedSources: 0, participations: 0 },
    };
  }

  private parseDateTime(value: string, field: "from" | "to"): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new AnalyticsInvalidQueryError(`invalid_${field}`);
    return parsed;
  }
}
