import { apiClient } from "../../../lib/apiClient";
import type { AnalyticsLeaderboard, AnalyticsOverview, AnalyticsPlayerDetails, AnalyticsQuery, AnalyticsRefreshResult, AnalyticsResources, AnalyticsRewardCategory } from "../types";

export class AnalyticsApiClient {
  async getOverview(projectId: string, query: AnalyticsQuery): Promise<AnalyticsOverview> {
    return apiClient.get<AnalyticsOverview>(this.getPath(projectId, "overview", query));
  }

  /** Admin-only synchronous projection rebuild for the project. */
  async refresh(projectId: string): Promise<AnalyticsRefreshResult> {
    return apiClient.post<AnalyticsRefreshResult>(`/api/projects/${encodeURIComponent(projectId)}/analytics/refresh`);
  }

  async getResources(projectId: string, query: AnalyticsQuery): Promise<AnalyticsResources> {
    return apiClient.get<AnalyticsResources>(this.getPath(projectId, "resources", query));
  }

  async getPlayers(projectId: string, query: AnalyticsQuery & { rewardCategory: AnalyticsRewardCategory; cursor?: string; limit: number }): Promise<AnalyticsLeaderboard> {
    return apiClient.get<AnalyticsLeaderboard>(this.getPath(projectId, "players", query));
  }

  async getPlayerDetails(
    projectId: string,
    playerId: string,
    query: AnalyticsQuery & { resourceId?: string; historyCursor?: string; historyLimit?: number },
  ): Promise<AnalyticsPlayerDetails> {
    const search = new URLSearchParams({ from: query.from, to: query.to, sourceTypes: query.sourceTypes.join(",") });
    if (query.resourceId) search.set("resourceId", query.resourceId);
    if (query.historyCursor) search.set("historyCursor", query.historyCursor);
    if (query.historyLimit) search.set("historyLimit", String(query.historyLimit));
    return apiClient.get<AnalyticsPlayerDetails>(
      `/api/projects/${encodeURIComponent(projectId)}/analytics/players/${encodeURIComponent(playerId)}?${search.toString()}`,
    );
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
