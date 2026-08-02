import { useCallback, useEffect, useState } from "react";
import { getGameConfigRequest, updateGameConfigRequest } from "../../projects/api/projects.client";
import type { AnyGameConfig, GameType, Project, UpdateGameConfigInput } from "../../projects/types";

type GameConfigFor<TGameType extends GameType> = Extract<AnyGameConfig, { gameType: TGameType }>;

export interface GameConfigDraft<TRules> {
  name: string;
  description: string;
  rules: TRules;
}

interface UseGameConfigEditorMessages {
  loadFailed: string;
  notFound: string;
}

function toDraft<TGameType extends GameType>(config: GameConfigFor<TGameType>): GameConfigDraft<GameConfigFor<TGameType>["rules"]> {
  return {
    name: config.name,
    description: config.description,
    rules: structuredClone(config.rules),
  } as GameConfigDraft<GameConfigFor<TGameType>["rules"]>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useGameConfigEditor<TGameType extends GameType>(
  project: Project | null,
  configId: string | undefined,
  gameType: TGameType,
  messages: UseGameConfigEditorMessages,
) {
  const [source, setSource] = useState<GameConfigFor<TGameType> | null>(null);
  const [draft, setDraft] = useState<GameConfigDraft<GameConfigFor<TGameType>["rules"]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!project || !configId) {
      setSource(null);
      setDraft(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const config = await getGameConfigRequest(project.id, configId);
      if (config.gameType !== gameType) {
        throw new Error(messages.notFound);
      }

      const typedConfig = config as GameConfigFor<TGameType>;
      setSource(typedConfig);
      setDraft(toDraft(typedConfig));
    } catch (nextError) {
      setSource(null);
      setDraft(null);
      setError(getErrorMessage(nextError, messages.loadFailed));
    } finally {
      setIsLoading(false);
    }
  }, [configId, gameType, messages.loadFailed, messages.notFound, project]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateDraft(patch: Partial<GameConfigDraft<GameConfigFor<TGameType>["rules"]>>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function reset() {
    if (source) {
      setDraft(toDraft(source));
      setError(null);
    }
  }

  async function save(): Promise<boolean> {
    if (!project || !source || !draft) {
      return false;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateGameConfigRequest(project.id, source.id, draft as UpdateGameConfigInput);
      if (updated.gameType !== gameType) {
        throw new Error(messages.notFound);
      }

      const typedConfig = updated as GameConfigFor<TGameType>;
      setSource(typedConfig);
      setDraft(toDraft(typedConfig));
      return true;
    } catch (nextError) {
      setError(getErrorMessage(nextError, messages.loadFailed));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    source,
    draft,
    error,
    isLoading,
    isSaving,
    actions: { load, reset, save, updateDraft },
  };
}
