import { useCallback, useEffect, useState } from "react";
import {
  getBattleshipsGameConfigsRequest,
  getJourneyGameConfigsRequest,
  getLottoGameConfigsRequest,
  createGameConfigRequest,
  updateGameConfigRequest,
} from "../../projects/api/projects.client";
import type { AnyGameConfig, CloneGameConfigInput, GameType, UpdateGameConfigInput } from "../../projects/types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось выполнить запрос к конфигам.";
}

export function useGameConfigs(projectId: string | undefined) {
  const [gameConfigs, setGameConfigs] = useState<AnyGameConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGameConfigs = useCallback(async () => {
    if (!projectId) {
      setGameConfigs([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [journey, battleships, lotto] = await Promise.all([
        getJourneyGameConfigsRequest(projectId),
        getBattleshipsGameConfigsRequest(projectId),
        getLottoGameConfigsRequest(projectId),
      ]);
      setGameConfigs([...journey, ...battleships, ...lotto]);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setGameConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadGameConfigs();
  }, [loadGameConfigs]);

  const updateGameConfig = useCallback(
    async (gameConfigId: string, input: UpdateGameConfigInput): Promise<AnyGameConfig | null> => {
      if (!projectId) {
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const updated = await updateGameConfigRequest(projectId, gameConfigId, input);
        setGameConfigs((current) => current.map((config) => (config.id === updated.id ? updated : config)));
        return updated;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const configsByGameType = (gameType: GameType) => gameConfigs.filter((config) => config.gameType === gameType);

  return {
    gameConfigs,
    configsByGameType,
    error,
    isLoading,
    isSaving,
    actions: {
      loadGameConfigs,
      updateGameConfig,
      cloneGameConfig: async (input: CloneGameConfigInput): Promise<AnyGameConfig | null> => {
        if (!projectId) return null;
        setIsSaving(true);
        setError(null);
        try {
          const created = await createGameConfigRequest(projectId, input);
          setGameConfigs((current) => [...current, created]);
          return created;
        } catch (nextError) {
          setError(getErrorMessage(nextError));
          return null;
        } finally {
          setIsSaving(false);
        }
      },
      setError,
    },
  };
}
