import { useCallback, useEffect, useMemo, useState } from "react";
import { analyticsApiClient } from "../api/analytics.client";
import { monthRange } from "../components/analyticsPeriods";
import { analyticsSourceTypes, type AnalyticsLeaderboard, type AnalyticsOverview, type AnalyticsQuery, type AnalyticsResources, type AnalyticsRewardCategory, type AnalyticsSourceType } from "../types";

const ALL_SOURCE_TYPES: AnalyticsSourceType[] = [...analyticsSourceTypes];
const LEADERBOARD_PAGE_SIZE = 5;

function currentMonthQuery(): AnalyticsQuery {
  return { ...monthRange(0), sourceTypes: ALL_SOURCE_TYPES };
}

export function useAnalyticsOverview(projectId: string | undefined) {
  const [query, setQuery] = useState<AnalyticsQuery>(currentMonthQuery);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [resources, setResources] = useState<AnalyticsResources | null>(null);
  const [leaderboard, setLeaderboard] = useState<AnalyticsLeaderboard | null>(null);
  const [rewardCategory, setRewardCategory] = useState<AnalyticsRewardCategory>("total");
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async (nextRewardCategory: AnalyticsRewardCategory): Promise<AnalyticsLeaderboard | null> => {
    if (!projectId) return null;
    setIsLoadingPlayers(true);
    setError(null);
    try {
      const nextLeaderboard = await analyticsApiClient.getPlayers(projectId, {
        ...query,
        rewardCategory: nextRewardCategory,
        limit: LEADERBOARD_PAGE_SIZE,
      });
      setLeaderboard(nextLeaderboard);
      return nextLeaderboard;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить список игроков.");
      return null;
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [projectId, query]);

  const reloadAnalytics = useCallback(async (leaderboardRewardCategory: AnalyticsRewardCategory) => {
    if (!projectId) {
      setOverview(null);
      setResources(null);
      setLeaderboard(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [nextOverview, nextResources] = await Promise.all([
        analyticsApiClient.getOverview(projectId, query),
        analyticsApiClient.getResources(projectId, query),
      ]);
      setOverview(nextOverview);
      setResources(nextResources);
      await loadLeaderboard(leaderboardRewardCategory);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить аналитику.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, query, loadLeaderboard]);

  useEffect(() => {
    void reloadAnalytics(rewardCategory);
  }, [reloadAnalytics]);

  const reload = useCallback(() => reloadAnalytics(rewardCategory), [reloadAnalytics, rewardCategory]);

  const showAllPlayers = useCallback(async () => {
    if (!projectId || !leaderboard) return false;
    if (!leaderboard.nextCursor) return leaderboard.players.length > LEADERBOARD_PAGE_SIZE;
    setIsLoadingPlayers(true);
    setError(null);
    try {
      const players = [...leaderboard.players];
      let cursor: string | null = leaderboard.nextCursor;
      let lastPage = leaderboard;
      while (cursor) {
        lastPage = await analyticsApiClient.getPlayers(projectId, { ...query, rewardCategory, cursor, limit: 100 });
        players.push(...lastPage.players);
        cursor = lastPage.nextCursor;
      }
      setLeaderboard({ ...lastPage, players, nextCursor: null });
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить список игроков.");
      return false;
    } finally {
      setIsLoadingPlayers(false);
    }
  }, [leaderboard, projectId, query, rewardCategory]);

  const selectRewardCategory = useCallback(async (nextRewardCategory: AnalyticsRewardCategory) => {
    if (nextRewardCategory === rewardCategory) return true;
    setRewardCategory(nextRewardCategory);
    return Boolean(await loadLeaderboard(nextRewardCategory));
  }, [loadLeaderboard, rewardCategory]);

  return useMemo(
    () => ({
      query,
      overview,
      resources,
      leaderboard,
      rewardCategory,
      isLoading,
      isLoadingPlayers,
      error,
      actions: { setQuery, selectRewardCategory, reload, showAllPlayers },
    }),
    [query, overview, resources, leaderboard, rewardCategory, isLoading, isLoadingPlayers, error, selectRewardCategory, reload, showAllPlayers],
  );
}
