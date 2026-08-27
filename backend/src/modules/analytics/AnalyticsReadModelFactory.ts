import type { ResourceSnapshot } from "../rewards";
import type { AnalyticsIntegrityReport } from "./AnalyticsIntegrityService";
import type { AnalyticsRefreshReport } from "./AnalyticsProjectionService";
import type {
  AnalyticsOverviewReadModel,
  AnalyticsPlayerDetailsReadModel,
  AnalyticsPlayerLeaderboardReadModel,
  AnalyticsResourcesReadModel,
  AnalyticsRewardTotals,
} from "./AnalyticsReadService";
import type { AnalyticsFactIssue, AnalyticsSourceStamp } from "./domain/types";

export interface AnalyticsSourceStampView {
  kind: AnalyticsSourceStamp["kind"];
  type: AnalyticsSourceStamp["type"];
  id: string;
  titleSnapshot?: string;
  quizId?: string;
  revision: number | null;
  updatedAt: string;
}

export interface AnalyticsIntegrityView {
  freshness: AnalyticsIntegrityReport["freshness"];
  sourceCountsByType: AnalyticsIntegrityReport["sourceCountsByType"];
  factCountsByType: AnalyticsIntegrityReport["factCountsByType"];
  missing: AnalyticsSourceStampView[];
  orphan: AnalyticsSourceStampView[];
  outdated: Array<{ expected: AnalyticsSourceStampView; actual: AnalyticsSourceStampView }>;
  partialFacts: Array<{
    source: AnalyticsSourceStampView;
    issues: Array<Pick<AnalyticsFactIssue, "code" | "nicknameSnapshot">>;
  }>;
}

export class AnalyticsReadModelFactory {
  createStatus(report: AnalyticsIntegrityReport): AnalyticsIntegrityView {
    return this.createIntegrity(report);
  }

  createRefresh(report: AnalyticsRefreshReport) {
    return {
      factsBuilt: report.factsBuilt,
      factsReplaced: report.factsReplaced,
      orphanFactsDeleted: report.orphanFactsDeleted,
      integrity: this.createIntegrity(report.integrity),
    };
  }

  createOverview(model: AnalyticsOverviewReadModel) {
    return {
      period: { ...model.period, sourceTypes: [...model.period.sourceTypes] },
      conductedSources: model.conductedSources,
      participations: model.participations,
      uniqueResolvedPlayers: model.uniqueResolvedPlayers,
      rewardsByResource: model.rewardsByResource.map((entry) => ({
        resourceId: entry.resourceId,
        rewards: this.createRewardTotals(entry.rewards),
      })),
      sourceBreakdown: { ...model.sourceBreakdown },
      activityByDay: model.activityByDay.map((entry) => ({ ...entry })),
      rewardsByDay: model.rewardsByDay.map((entry) => ({
        date: entry.date,
        rewardsByResource: entry.rewardsByResource.map((resource) => ({
          resourceId: resource.resourceId,
          rewards: this.createRewardTotals(resource.rewards),
        })),
      })),
      integrity: this.createIntegrity(model.integrity),
    };
  }

  createResources(model: AnalyticsResourcesReadModel) {
    return {
      period: { ...model.period, sourceTypes: [...model.period.sourceTypes] },
      resources: model.resources.map((entry) => ({
        resource: this.createResourceSnapshot(entry.resource),
        catalogStatus: entry.catalogStatus,
        rewards: this.createRewardTotals(entry.rewards),
      })),
      integrity: this.createIntegrity(model.integrity),
    };
  }

  createPlayerLeaderboard(model: AnalyticsPlayerLeaderboardReadModel) {
    return {
      period: { ...model.period, sourceTypes: [...model.period.sourceTypes] },
      rewardCategory: model.rewardCategory,
      resource: {
        resource: this.createResourceSnapshot(model.resource.resource),
        catalogStatus: model.resource.catalogStatus,
      },
      players: model.players.map((player) => ({
        playerRefId: player.playerRefId,
        nicknameSnapshot: player.nicknameSnapshot,
        participations: player.participations,
        rewards: this.createRewardTotals(player.rewards),
      })),
      nextCursor: model.nextCursor,
      integrity: this.createIntegrity(model.integrity),
    };
  }

  createPlayerDetails(model: AnalyticsPlayerDetailsReadModel) {
    return {
      period: { ...model.period, sourceTypes: [...model.period.sourceTypes] },
      player: { ...model.player },
      resource: {
        resource: this.createResourceSnapshot(model.resource.resource),
        catalogStatus: model.resource.catalogStatus,
      },
      participations: model.participations,
      rewardsByResource: model.rewardsByResource.map((entry) => ({
        resource: this.createResourceSnapshot(entry.resource),
        catalogStatus: entry.catalogStatus,
        rewards: this.createRewardTotals(entry.rewards),
      })),
      rewardsByDay: model.rewardsByDay.map((entry) => ({ date: entry.date, rewards: this.createRewardTotals(entry.rewards) })),
      rewardsBySourceType: Object.fromEntries(
        Object.entries(model.rewardsBySourceType).map(([sourceType, entry]) => [
          sourceType,
          { participations: entry.participations, rewards: this.createRewardTotals(entry.rewards) },
        ]),
      ),
      positionsBySourceType: model.positionsBySourceType.map((entry) => ({
        sourceType: entry.sourceType,
        participations: entry.participations,
        rewards: this.createRewardTotals(entry.rewards),
        rank: entry.rank,
        rankedPlayers: entry.rankedPlayers,
      })),
      history: {
        entries: model.history.entries.map((entry) => ({
          occurredOn: entry.occurredOn,
          source: { ...entry.source },
          rewards: entry.rewards.map((reward) => ({ ...reward })),
        })),
        nextCursor: model.history.nextCursor,
      },
      integrity: this.createIntegrity(model.integrity),
    };
  }

  private createIntegrity(report: AnalyticsIntegrityReport): AnalyticsIntegrityView {
    return {
      freshness: report.freshness,
      sourceCountsByType: { ...report.sourceCountsByType },
      factCountsByType: { ...report.factCountsByType },
      missing: report.missing.map((source) => this.createSourceStamp(source)),
      orphan: report.orphan.map((source) => this.createSourceStamp(source)),
      outdated: report.outdated.map((entry) => ({
        expected: this.createSourceStamp(entry.expected),
        actual: this.createSourceStamp(entry.actual),
      })),
      partialFacts: report.partialFacts.map((entry) => ({
        source: this.createSourceStamp(entry.source),
        issues: entry.issues.map((issue) => ({ code: issue.code, nicknameSnapshot: issue.nicknameSnapshot })),
      })),
    };
  }

  private createSourceStamp(source: AnalyticsSourceStamp): AnalyticsSourceStampView {
    return {
      kind: source.kind,
      type: source.type,
      id: source.id,
      ...(source.titleSnapshot ? { titleSnapshot: source.titleSnapshot } : {}),
      ...(source.quizId ? { quizId: source.quizId } : {}),
      revision: source.revision,
      updatedAt: source.updatedAt,
    };
  }

  private createRewardTotals(totals: AnalyticsRewardTotals): AnalyticsRewardTotals {
    return { regular: totals.regular, bonus: totals.bonus, total: totals.total };
  }

  private createResourceSnapshot(resource: ResourceSnapshot): ResourceSnapshot {
    return { ...resource };
  }
}
