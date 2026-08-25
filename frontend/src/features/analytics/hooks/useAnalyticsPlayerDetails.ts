import { useCallback, useEffect, useMemo, useState } from "react";
import { analyticsApiClient } from "../api/analytics.client";
import type { AnalyticsPlayerDetails, AnalyticsQuery } from "../types";

const HISTORY_PAGE_SIZE = 10;

export function useAnalyticsPlayerDetails(
  projectId: string | undefined,
  playerId: string | undefined,
  query: AnalyticsQuery,
  resourceId: string | undefined,
  enabled: boolean,
) {
  const [details, setDetails] = useState<AnalyticsPlayerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !playerId || !enabled) {
      setDetails(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setDetails(await analyticsApiClient.getPlayerDetails(projectId, playerId, { ...query, resourceId, historyLimit: HISTORY_PAGE_SIZE }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить аналитику игрока.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, playerId, projectId, query, resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMoreHistory = useCallback(async () => {
    if (!projectId || !playerId || !details?.history.nextCursor) return;
    setIsLoadingHistory(true);
    setError(null);
    try {
      const next = await analyticsApiClient.getPlayerDetails(projectId, playerId, {
        ...query,
        resourceId,
        historyCursor: details.history.nextCursor,
        historyLimit: HISTORY_PAGE_SIZE,
      });
      setDetails({ ...next, history: { entries: [...details.history.entries, ...next.history.entries], nextCursor: next.history.nextCursor } });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить историю участий.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [details, playerId, projectId, query, resourceId]);

  return useMemo(
    () => ({ details, isLoading, isLoadingHistory, error, actions: { reload: load, loadMoreHistory } }),
    [details, error, isLoading, isLoadingHistory, load, loadMoreHistory],
  );
}
