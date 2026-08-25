export const analyticsSourceTypes = ["journey", "battleships", "lotto", "lotto_bingo", "quiz"] as const;

export type AnalyticsSourceType = (typeof analyticsSourceTypes)[number];
export type AnalyticsRewardCategory = "total" | "regular" | "bonus";

export interface AnalyticsPeriod {
  from: string;
  to: string;
  sourceTypes: AnalyticsSourceType[];
}

export interface AnalyticsRewardTotals {
  regular: number;
  bonus: number;
  total: number;
}

export interface AnalyticsResource {
  id: string;
  code: string;
  name: string;
  label: string;
  type: "currency" | "item";
  valueType?: "integer" | "decimal";
  precision?: number;
}

export interface AnalyticsIntegrity {
  freshness: "fresh" | "stale" | "missing";
}

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  conductedSources: number;
  participations: number;
  uniqueResolvedPlayers: number;
  rewardsByResource: Array<{ resourceId: string; rewards: AnalyticsRewardTotals }>;
  sourceBreakdown: Record<AnalyticsSourceType, { conductedSources: number; participations: number }>;
  activityByDay: Array<{ date: string; conductedSources: number; participations: number }>;
  rewardsByDay: Array<{
    date: string;
    rewardsByResource: Array<{ resourceId: string; rewards: AnalyticsRewardTotals }>;
  }>;
  integrity: AnalyticsIntegrity;
}

export interface AnalyticsResources {
  period: AnalyticsPeriod;
  resources: Array<{
    resource: AnalyticsResource;
    catalogStatus: "current" | "historical";
    rewards: AnalyticsRewardTotals;
  }>;
  integrity: AnalyticsIntegrity;
}

export interface AnalyticsLeaderboard {
  period: AnalyticsPeriod;
  rewardCategory: AnalyticsRewardCategory;
  resource: { resource: AnalyticsResource; catalogStatus: "current" | "historical" };
  players: Array<{
    playerRefId: string;
    nicknameSnapshot: string;
    participations: number;
    rewards: AnalyticsRewardTotals;
  }>;
  nextCursor: string | null;
  integrity: AnalyticsIntegrity;
}

export interface AnalyticsQuery {
  from: string;
  to: string;
  sourceTypes: AnalyticsSourceType[];
}
