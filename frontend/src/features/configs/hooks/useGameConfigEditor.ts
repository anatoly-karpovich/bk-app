import { useCallback, useEffect, useState } from "react";
import { createGameConfigRequest, getGameConfigRequest, updateGameConfigRequest } from "../../projects/api/projects.client";
import type { AnyGameConfig, CreateGameConfigInput, GameType, Project, UpdateGameConfigInput } from "../../projects/types";

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
  sourceConfigId?: string | null,
) {
  const isCreating = configId === "new";
  const [source, setSource] = useState<GameConfigFor<TGameType> | null>(null);
  const [draft, setDraft] = useState<GameConfigDraft<GameConfigFor<TGameType>["rules"]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sourceId = isCreating ? sourceConfigId : configId;
    if (!project || !sourceId) {
      setSource(null);
      setDraft(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const config = await getGameConfigRequest(project.id, sourceId);
      if (config.gameType !== gameType) {
        throw new Error(messages.notFound);
      }

      const typedConfig = config as GameConfigFor<TGameType>;
      setSource(typedConfig);
      const nextDraft = toDraft(typedConfig);
      setDraft(isCreating ? { ...nextDraft, name: `${nextDraft.name} — копия` } : nextDraft);
    } catch (nextError) {
      setSource(null);
      setDraft(null);
      setError(getErrorMessage(nextError, messages.loadFailed));
    } finally {
      setIsLoading(false);
    }
  }, [configId, gameType, isCreating, messages.loadFailed, messages.notFound, project, sourceConfigId]);

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

  async function save(): Promise<GameConfigFor<TGameType> | null> {
    if (!project || !source || !draft) {
      return null;
    }

    setIsSaving(true);
    setError(null);
    try {
      const saved = isCreating
        ? await createGameConfigRequest(project.id, { gameType, ...draft } as CreateGameConfigInput)
        : await updateGameConfigRequest(project.id, source.id, draft as UpdateGameConfigInput);
      if (saved.gameType !== gameType) {
        throw new Error(messages.notFound);
      }

      const typedConfig = saved as GameConfigFor<TGameType>;
      setSource(typedConfig);
      setDraft(toDraft(typedConfig));
      return typedConfig;
    } catch (nextError) {
      setError(getErrorMessage(nextError, messages.loadFailed));
      return null;
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
    isCreating,
    actions: { load, reset, save, updateDraft },
  };
}
