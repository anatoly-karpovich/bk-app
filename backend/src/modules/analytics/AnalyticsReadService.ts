import type { ResourceSnapshot } from "../rewards";
import { ProjectNotFoundError } from "../projects/errors/ProjectNotFoundError";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import type { ProjectResource } from "../projects/domain/types";
import { AnalyticsIntegrityService, type AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import { ANALYTICS_SOURCE_TYPES, type AnalyticsSourceType } from "./domain/sourceTypes";
import { isAnalyticsCalendarDate, utcDateFromTimestamp } from "./domain/occurrenceDate";
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
  rewardCategory?: AnalyticsLeaderboardRewardCategory;
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface AnalyticsPlayerDetailsQuery extends AnalyticsReadQuery {
  resourceId?: string;
  historyCursor?: string;
  historyLimit?: number;
}

export type AnalyticsLeaderboardRewardCategory = "total" | "regular" | "bonus";

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
  sourceBreakdown: Record<
    AnalyticsSourceType,
    { conductedSources: number; fallbackDateSources: number; participations: number; uniquePlayers: number }
  >;
  activityByDay: Array<{ date: string; conductedSources: number; participations: number }>;
  rewardsByDay: Array<{
    date: string;
    rewardsByResource: Array<{ resourceId: string; rewards: AnalyticsRewardTotals }>;
  }>;
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
  rewardCategory: AnalyticsLeaderboardRewardCategory;
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

export interface AnalyticsPlayerDetailsReadModel {
  period: AnalyticsReadPeriod;
  player: { playerRefId: string; nicknameSnapshot: string | null };
  resource: { resource: ResourceSnapshot; catalogStatus: AnalyticsResourceCatalogStatus };
  participations: number;
  rewardsByResource: Array<{
    resource: ResourceSnapshot;
    catalogStatus: AnalyticsResourceCatalogStatus;
    rewards: AnalyticsRewardTotals;
  }>;
  rewardsByDay: Array<{ date: string; rewards: AnalyticsRewardTotals }>;
  rewardsBySourceType: Record<AnalyticsSourceType, { participations: number; rewards: AnalyticsRewardTotals }>;
  positionsBySourceType: Array<{
    sourceType: AnalyticsSourceType;
    participations: number;
    rewards: AnalyticsRewardTotals;
    rank: number | null;
    rankedPlayers: number;
  }>;
  history: {
    entries: Array<{
      occurredOn: string;
      source: { type: AnalyticsSourceType; titleSnapshot: string };
      rewards: AnalyticsRewardTotalsByResource[];
    }>;
    nextCursor: string | null;
  };
  integrity: AnalyticsIntegrityReport;
}

export interface AnalyticsRewardTotalsByResource {
  resourceId: string;
  amount: number;
}

interface NormalizedReadQuery extends AnalyticsReadPeriod {}

interface PlayerAggregate {
  playerRefId: string;
  nicknameSnapshot: string;
  newestOccurredOn: string;
  participations: number;
  regular: number;
  bonus: number;
}

interface DecodedCursor {
  score: number;
  playerRefId: string;
  rewardCategory: AnalyticsLeaderboardRewardCategory;
}

interface DecodedHistoryCursor {
  occurredOn: string;
  sourceId: string;
}

interface PlayerFactParticipant {
  fact: AnalyticsFactDocument;
  participant: AnalyticsFactDocument["participants"][number];
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
    const rewardsByDay = new Map<string, Map<string, AnalyticsRewardTotals>>();
    const resolvedPlayerIds = new Set<string>();
    const uniquePlayerIdsByType = Object.fromEntries(
      ANALYTICS_SOURCE_TYPES.map((sourceType) => [sourceType, new Set<string>()]),
    ) as Record<AnalyticsSourceType, Set<string>>;
    let participations = 0;

    for (const fact of filteredFacts) {
      const breakdown = sourceBreakdown[fact.source.type];
      breakdown.conductedSources += 1;
      if (fact.occurrenceDateSource === "finalized_at") {
        breakdown.fallbackDateSources += 1;
      }
      breakdown.participations += fact.participants.length;
      participations += fact.participants.length;
      const date = this.occurredOnForFact(fact);
      const activity = activityByDay.get(date) ?? { conductedSources: 0, participations: 0 };
      activity.conductedSources += 1;
      activity.participations += fact.participants.length;
      activityByDay.set(date, activity);
      const dailyRewardsByResource = rewardsByDay.get(date) ?? new Map<string, AnalyticsRewardTotals>();

      for (const participant of fact.participants) {
        if (participant.playerRefId) {
          resolvedPlayerIds.add(participant.playerRefId);
          uniquePlayerIdsByType[fact.source.type].add(participant.playerRefId);
        }
        this.addRewardsByResource(rewardsByResource, participant.rewards.regular, "regular");
        this.addRewardsByResource(rewardsByResource, participant.rewards.bonus, "bonus");
        this.addRewardsByResource(dailyRewardsByResource, participant.rewards.regular, "regular");
        this.addRewardsByResource(dailyRewardsByResource, participant.rewards.bonus, "bonus");
      }
      rewardsByDay.set(date, dailyRewardsByResource);
    }

    for (const sourceType of Object.keys(sourceBreakdown) as AnalyticsSourceType[]) {
      sourceBreakdown[sourceType].uniquePlayers = uniquePlayerIdsByType[sourceType].size;
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
      rewardsByDay: Array.from(rewardsByDay.entries())
        .map(([date, dailyRewards]) => ({ date, rewardsByResource: this.toSortedResourceTotals(dailyRewards) }))
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
    const rewardCategory = this.normalizeRewardCategory(query.rewardCategory);
    const aggregates = this.collectPlayerAggregates(this.filterFacts(facts, normalizedQuery), selectedResource.resource.id);
    const search = this.normalizeSearch(query.search);
    const cursor = query.cursor ? this.decodeCursor(query.cursor, rewardCategory) : undefined;
    const limit = this.normalizePageLimit(query.limit);
    const orderedPlayers = Array.from(aggregates.values())
      .filter((player) => this.rewardScore(player, rewardCategory) > 0)
      .filter((player) => !search || player.nicknameSnapshot.toLocaleLowerCase("ru").includes(search))
      .sort((left, right) => this.rewardScore(right, rewardCategory) - this.rewardScore(left, rewardCategory) || left.playerRefId.localeCompare(right.playerRefId));
    const afterCursor = cursor ? orderedPlayers.filter((player) => this.isAfterCursor(player, cursor, rewardCategory)) : orderedPlayers;
    const page = afterCursor.slice(0, limit);
    const nextPlayer = afterCursor[limit];

    return {
      period: normalizedQuery,
      rewardCategory,
      resource: selectedResource,
      players: page.map((player) => ({
        playerRefId: player.playerRefId,
        nicknameSnapshot: player.nicknameSnapshot,
        participations: player.participations,
        rewards: this.toRewardTotals(player.regular, player.bonus),
      })),
      nextCursor: nextPlayer ? this.encodeCursor(page.at(-1)!, rewardCategory) : null,
      integrity,
    };
  }

  async getPlayerDetails(
    projectId: string,
    playerRefId: string,
    query: AnalyticsPlayerDetailsQuery = {},
  ): Promise<AnalyticsPlayerDetailsReadModel> {
    const normalizedQuery = this.normalizeQuery(query);
    const [project, facts, integrity] = await Promise.all([
      this.getProjectOrThrow(projectId),
      this.projectionRepository.findByProjectId(projectId),
      this.integrityService.inspectProject(projectId),
    ]);
    const resourceCatalog = this.collectResourceCatalog(project.resources, facts);
    const selectedResource = this.selectResource(resourceCatalog, query.resourceId);
    const playerFacts = this.collectPlayerFacts(this.filterFacts(facts, normalizedQuery), playerRefId);
    const rewardsByResource = this.collectPlayerRewardsByResource(playerFacts);
    const nicknameSnapshot = playerFacts
      .slice()
      .sort((left, right) => this.occurredOnForFact(right.fact).localeCompare(this.occurredOnForFact(left.fact)))[0]
      ?.participant.nicknameSnapshot ?? null;
    const rewardsByDay = this.collectPlayerRewardsByDay(playerFacts, selectedResource.resource.id);
    const rewardsBySourceType = this.collectPlayerRewardsBySourceType(playerFacts, selectedResource.resource.id);

    return {
      period: normalizedQuery,
      player: { playerRefId, nicknameSnapshot },
      resource: selectedResource,
      participations: playerFacts.length,
      rewardsByResource: resourceCatalog.map((entry) => ({
        ...entry,
        rewards: rewardsByResource.get(entry.resource.id) ?? this.emptyRewardTotals(),
      })),
      rewardsByDay,
      rewardsBySourceType,
      positionsBySourceType: this.collectPlayerPositions(
        this.filterFacts(facts, normalizedQuery),
        playerRefId,
        selectedResource.resource.id,
        rewardsBySourceType,
      ),
      history: this.createPlayerHistory(playerFacts, query.historyCursor, query.historyLimit),
      integrity,
    };
  }

  private normalizeQuery(query: AnalyticsReadQuery): NormalizedReadQuery {
    const now = this.now();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const from = query.from ?? defaultFrom.toISOString().slice(0, 10);
    const to = query.to ?? defaultTo.toISOString().slice(0, 10);
    if (!isAnalyticsCalendarDate(from)) throw new AnalyticsInvalidQueryError("invalid_from");
    if (!isAnalyticsCalendarDate(to)) throw new AnalyticsInvalidQueryError("invalid_to");
    if (from > to) throw new AnalyticsInvalidQueryError("from_must_be_before_to");

    const sourceTypes = query.sourceTypes ? [...query.sourceTypes] : [...ANALYTICS_SOURCE_TYPES];
    if (
      sourceTypes.some((sourceType) => !ANALYTICS_SOURCE_TYPES.includes(sourceType)) ||
      new Set(sourceTypes).size !== sourceTypes.length
    ) {
      throw new AnalyticsInvalidQueryError("invalid_source_types");
    }

    return { from, to, sourceTypes };
  }

  private filterFacts<T extends AnalyticsFactDocument>(facts: ReadonlyArray<T>, query: NormalizedReadQuery): T[] {
    const sourceTypes = new Set(query.sourceTypes);
    return facts.filter((fact) => {
      const occurredOn = this.occurredOnForFact(fact);
      return occurredOn >= query.from && occurredOn <= query.to && sourceTypes.has(fact.source.type);
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
    for (const fact of [...facts].sort((left, right) => this.occurredOnForFact(right).localeCompare(this.occurredOnForFact(left)))) {
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
          newestOccurredOn: this.occurredOnForFact(fact),
          participations: 0,
          regular: 0,
          bonus: 0,
        };
        current.participations += 1;
        current.regular += this.amountForResource(participant.rewards.regular, resourceId);
        current.bonus += this.amountForResource(participant.rewards.bonus, resourceId);
        if (this.occurredOnForFact(fact) > current.newestOccurredOn) {
          current.nicknameSnapshot = participant.nicknameSnapshot;
          current.newestOccurredOn = this.occurredOnForFact(fact);
        }
        players.set(participant.playerRefId, current);
      }
    }
    return players;
  }

  private collectPlayerFacts(facts: ReadonlyArray<AnalyticsFactDocument>, playerRefId: string): PlayerFactParticipant[] {
    return facts.flatMap((fact) => {
      const participant = fact.participants.find((entry) => entry.playerRefId === playerRefId);
      return participant ? [{ fact, participant }] : [];
    });
  }

  private collectPlayerRewardsByResource(playerFacts: ReadonlyArray<PlayerFactParticipant>): Map<string, AnalyticsRewardTotals> {
    const rewards = new Map<string, AnalyticsRewardTotals>();
    for (const { participant } of playerFacts) {
      this.addRewardsByResource(rewards, participant.rewards.regular, "regular");
      this.addRewardsByResource(rewards, participant.rewards.bonus, "bonus");
    }
    return rewards;
  }

  private collectPlayerRewardsByDay(
    playerFacts: ReadonlyArray<PlayerFactParticipant>,
    resourceId: string,
  ): Array<{ date: string; rewards: AnalyticsRewardTotals }> {
    const byDay = new Map<string, AnalyticsRewardTotals>();
    for (const { fact, participant } of playerFacts) {
      const date = this.occurredOnForFact(fact);
      const current = byDay.get(date) ?? this.emptyRewardTotals();
      current.regular += this.amountForResource(participant.rewards.regular, resourceId);
      current.bonus += this.amountForResource(participant.rewards.bonus, resourceId);
      current.total = current.regular + current.bonus;
      byDay.set(date, current);
    }
    return Array.from(byDay.entries())
      .map(([date, rewards]) => ({ date, rewards }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private collectPlayerRewardsBySourceType(
    playerFacts: ReadonlyArray<PlayerFactParticipant>,
    resourceId: string,
  ): AnalyticsPlayerDetailsReadModel["rewardsBySourceType"] {
    const result = Object.fromEntries(
      ANALYTICS_SOURCE_TYPES.map((sourceType) => [sourceType, { participations: 0, rewards: this.emptyRewardTotals() }]),
    ) as AnalyticsPlayerDetailsReadModel["rewardsBySourceType"];
    for (const { fact, participant } of playerFacts) {
      const current = result[fact.source.type];
      current.participations += 1;
      current.rewards.regular += this.amountForResource(participant.rewards.regular, resourceId);
      current.rewards.bonus += this.amountForResource(participant.rewards.bonus, resourceId);
      current.rewards.total = current.rewards.regular + current.rewards.bonus;
    }
    return result;
  }

  private collectPlayerPositions(
    facts: ReadonlyArray<AnalyticsFactDocument>,
    playerRefId: string,
    resourceId: string,
    rewardsBySourceType: AnalyticsPlayerDetailsReadModel["rewardsBySourceType"],
  ): AnalyticsPlayerDetailsReadModel["positionsBySourceType"] {
    return ANALYTICS_SOURCE_TYPES.flatMap((sourceType) => {
      const rewards = rewardsBySourceType[sourceType];
      if (rewards.participations === 0) return [];
      const players = Array.from(this.collectPlayerAggregates(facts.filter((fact) => fact.source.type === sourceType), resourceId).values())
        .filter((player) => this.rewardScore(player, "total") > 0)
        .sort((left, right) => this.rewardScore(right, "total") - this.rewardScore(left, "total") || left.playerRefId.localeCompare(right.playerRefId));
      const rank = players.findIndex((player) => player.playerRefId === playerRefId);
      return [{
        sourceType,
        participations: rewards.participations,
        rewards: { ...rewards.rewards },
        rank: rank === -1 ? null : rank + 1,
        rankedPlayers: players.length,
      }];
    });
  }

  private createPlayerHistory(
    playerFacts: ReadonlyArray<PlayerFactParticipant>,
    cursorInput: string | undefined,
    limitInput: number | undefined,
  ): AnalyticsPlayerDetailsReadModel["history"] {
    const cursor = cursorInput ? this.decodeHistoryCursor(cursorInput) : undefined;
    const limit = this.normalizePageLimit(limitInput);
    const ordered = playerFacts
      .slice()
      .sort((left, right) => this.occurredOnForFact(right.fact).localeCompare(this.occurredOnForFact(left.fact)) || right.fact.source.id.localeCompare(left.fact.source.id));
    const afterCursor = cursor
      ? ordered.filter(({ fact }) => {
          const occurredOn = this.occurredOnForFact(fact);
          return occurredOn < cursor.occurredOn || (occurredOn === cursor.occurredOn && fact.source.id < cursor.sourceId);
        })
      : ordered;
    const entries = afterCursor.slice(0, limit).map(({ fact, participant }) => ({
      occurredOn: this.occurredOnForFact(fact),
      source: { type: fact.source.type, titleSnapshot: fact.source.titleSnapshot ?? this.defaultSourceTitle(fact.source.type) },
      rewards: this.combineParticipantRewards(participant),
    }));
    const next = afterCursor[limit];
    return {
      entries,
      nextCursor: next ? this.encodeHistoryCursor(afterCursor[limit - 1].fact) : null,
    };
  }

  private combineParticipantRewards(participant: AnalyticsFactDocument["participants"][number]): AnalyticsRewardTotalsByResource[] {
    const amounts = new Map<string, number>();
    for (const reward of [...participant.rewards.regular, ...participant.rewards.bonus]) {
      amounts.set(reward.resourceId, (amounts.get(reward.resourceId) ?? 0) + reward.amount);
    }
    return Array.from(amounts.entries())
      .map(([resourceId, amount]) => ({ resourceId, amount }))
      .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
  }

  private encodeHistoryCursor(fact: AnalyticsFactDocument): string {
    return Buffer.from(JSON.stringify({ occurredOn: this.occurredOnForFact(fact), sourceId: fact.source.id })).toString("base64url");
  }

  private decodeHistoryCursor(cursor: string): DecodedHistoryCursor {
    try {
      const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (!value || typeof value !== "object" || !isAnalyticsCalendarDate((value as DecodedHistoryCursor).occurredOn) || !this.isNonEmptyString((value as DecodedHistoryCursor).sourceId)) {
        throw new Error("Invalid cursor shape");
      }
      return value as DecodedHistoryCursor;
    } catch {
      throw new AnalyticsInvalidQueryError("invalid_history_cursor");
    }
  }

  private defaultSourceTitle(sourceType: AnalyticsSourceType): string {
    return {
      journey: "Карта Мародёров",
      battleships: "Морской бой",
      lotto: "Лото",
      lotto_bingo: "Лото Бинго",
      quiz: "Викторина",
      memes: "Игра «Карты, Мемы, Два ствола!»",
      forum_quiz: "Форумная викторина",
      tournament: "Турнир",
      forecast_contest: "Конкурс Прогнозистов",
      contest: "Конкурс",
    }[sourceType];
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

  private normalizeRewardCategory(category: AnalyticsLeaderboardRewardCategory | undefined): AnalyticsLeaderboardRewardCategory {
    if (category === undefined) return "total";
    if (category === "total" || category === "regular" || category === "bonus") return category;
    throw new AnalyticsInvalidQueryError("invalid_reward_category");
  }

  private encodeCursor(player: PlayerAggregate, rewardCategory: AnalyticsLeaderboardRewardCategory): string {
    return Buffer.from(JSON.stringify({ score: this.rewardScore(player, rewardCategory), playerRefId: player.playerRefId, rewardCategory })).toString("base64url");
  }

  private decodeCursor(cursor: string, rewardCategory: AnalyticsLeaderboardRewardCategory): DecodedCursor {
    try {
      const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (
        !value ||
        typeof value !== "object" ||
          !Number.isFinite((value as DecodedCursor).score) ||
          typeof (value as DecodedCursor).playerRefId !== "string" ||
          !(value as DecodedCursor).playerRefId ||
          ((value as DecodedCursor).rewardCategory !== "total" && (value as DecodedCursor).rewardCategory !== "regular" && (value as DecodedCursor).rewardCategory !== "bonus") ||
          (value as DecodedCursor).rewardCategory !== rewardCategory
      ) {
        throw new Error("Invalid cursor shape");
      }
      return value as DecodedCursor;
    } catch {
      throw new AnalyticsInvalidQueryError("invalid_cursor");
    }
  }

  private isAfterCursor(player: PlayerAggregate, cursor: DecodedCursor, rewardCategory: AnalyticsLeaderboardRewardCategory): boolean {
    const score = this.rewardScore(player, rewardCategory);
    return score < cursor.score || (score === cursor.score && player.playerRefId > cursor.playerRefId);
  }

  private rewardScore(player: PlayerAggregate, rewardCategory: AnalyticsLeaderboardRewardCategory): number {
    return rewardCategory === "regular" ? player.regular : rewardCategory === "bonus" ? player.bonus : player.regular + player.bonus;
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
    return Object.fromEntries(
      ANALYTICS_SOURCE_TYPES.map((sourceType) => [
        sourceType,
        { conductedSources: 0, fallbackDateSources: 0, participations: 0, uniquePlayers: 0 },
      ]),
    ) as AnalyticsOverviewReadModel["sourceBreakdown"];
  }

  private occurredOnForFact(fact: AnalyticsFactDocument): string {
    if (isAnalyticsCalendarDate(fact.occurredOn)) return fact.occurredOn;
    if (typeof fact.occurredAt === "string" && fact.occurredAt.trim()) return utcDateFromTimestamp(fact.occurredAt);
    throw new Error("Analytics fact is missing an occurrence date");
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
