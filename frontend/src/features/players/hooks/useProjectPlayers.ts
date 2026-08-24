import { useCallback, useEffect, useState } from "react";
import { getProjectPlayersRequest } from "../api/players.client";
import type { ProjectPlayer } from "../types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось загрузить игроков проекта";
}

export function useProjectPlayers(projectId: string | undefined) {
  const [players, setPlayers] = useState<ProjectPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setPlayers([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPlayers() {
      setError(null);
      setIsLoading(true);

      try {
        const nextPlayers = await getProjectPlayersRequest(projectId);
        if (!cancelled) setPlayers(nextPlayers);
      } catch (loadError) {
        if (!cancelled) {
          setPlayers([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadVersion]);

  const reload = useCallback(() => setReloadVersion((current) => current + 1), []);

  return { players, error, isLoading, reload };
}
