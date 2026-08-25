import { apiClient } from "../../../lib/apiClient";
import type { AnalyticsLeaderboard, AnalyticsOverview, AnalyticsQuery, AnalyticsResources, AnalyticsRewardCategory } from "../types";

export class AnalyticsApiClient {
  async getOverview(projectId: string, query: AnalyticsQuery): Promise<AnalyticsOverview> {
    return apiClient.get<AnalyticsOverview>(this.getPath(projectId, "overview", query));
  }

  async getResources(projectId: string, query: AnalyticsQuery): Promise<AnalyticsResources> {
    return apiClient.get<AnalyticsResources>(this.getPath(projectId, "resources", query));
  }

  async getPlayers(projectId: string, query: AnalyticsQuery & { rewardCategory: AnalyticsRewardCategory; cursor?: string; limit: number }): Promise<AnalyticsLeaderboard> {
    return apiClient.get<AnalyticsLeaderboard>(this.getPath(projectId, "players", query));
  }

  private getPath(projectId: string, endpoint: "overview" | "resources" | "players", query: AnalyticsQuery & { rewardCategory?: AnalyticsRewardCategory; cursor?: string; limit?: number }): string {
    const search = new URLSearchParams({ from: query.from, to: query.to, sourceTypes: query.sourceTypes.join(",") });
    if (query.cursor) search.set("cursor", query.cursor);
    if (query.limit) search.set("limit", String(query.limit));
    if (query.rewardCategory) search.set("rewardCategory", query.rewardCategory);
    return `/api/projects/${encodeURIComponent(projectId)}/analytics/${endpoint}?${search.toString()}`;
  }
}

export const analyticsApiClient = new AnalyticsApiClient();
