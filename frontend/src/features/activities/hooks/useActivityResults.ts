import { useCallback, useEffect, useMemo, useState } from "react";
import { activitiesApiClient } from "../api/activities.client";
import type { ActivityResultListItem } from "../types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось загрузить активности.";
}

export function useActivityResults(projectId: string | undefined) {
  const [activities, setActivities] = useState<ActivityResultListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(projectId));
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setError(null);
      try {
        const nextActivities = await activitiesApiClient.list(projectId);
        if (!cancelled) setActivities(nextActivities);
      } catch (loadError) {
        if (!cancelled) {
          setActivities([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadVersion]);

  const reload = useCallback(() => setReloadVersion((current) => current + 1), []);

  return useMemo(
    () => ({ activities, error, isLoading, reload }),
    [activities, error, isLoading, reload],
  );
}
