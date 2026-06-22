import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfigsRequest } from "../api/config.client";
import { loadSelectedConfigId, saveSelectedConfigId } from "../storage";
import type { AppConfig } from "../types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Config request failed";
}

export function useConfigs() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState(() => loadSelectedConfigId() ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextConfigs = await getConfigsRequest();
      setConfigs(nextConfigs);

      const storedConfigId = loadSelectedConfigId();
      const fallbackConfigId = nextConfigs[0]?.id ?? "";
      const resolvedConfigId =
        (storedConfigId && nextConfigs.some((config) => config.id === storedConfigId) && storedConfigId) || fallbackConfigId;

      setSelectedConfigId(resolvedConfigId);

      if (resolvedConfigId) {
        saveSelectedConfigId(resolvedConfigId);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const selectConfig = useCallback((nextConfigId: string) => {
    setSelectedConfigId(nextConfigId);
    saveSelectedConfigId(nextConfigId);
  }, []);

  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? configs[0] ?? null,
    [configs, selectedConfigId],
  );

  return {
    configs,
    selectedConfigId,
    selectedConfig,
    isLoading,
    error,
    actions: {
      loadConfigs,
      selectConfig,
    },
  };
}
