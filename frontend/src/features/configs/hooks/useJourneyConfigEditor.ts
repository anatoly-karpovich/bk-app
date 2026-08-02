import { useCallback, useEffect, useState } from "react";
import { getGameConfigRequest, updateGameConfigRequest } from "../../projects/api/projects.client";
import type { JourneyGameConfig, Project, UpdateGameConfigInput } from "../../projects/types";
import type { JourneyRules } from "../../journey/types";
import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";

interface JourneyConfigDraft {
  name: string;
  description: string;
  rules: JourneyRules;
}

function toDraft(config: JourneyGameConfig): JourneyConfigDraft {
  return { name: config.name, description: config.description, rules: structuredClone(config.rules) };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : journeyConfigTexts.alerts.loadFailed;
}

export function useJourneyConfigEditor(project: Project | null, configId: string | undefined) {
  const [source, setSource] = useState<JourneyGameConfig | null>(null);
  const [draft, setDraft] = useState<JourneyConfigDraft | null>(null);
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
      if (config.gameType !== "journey") {
        throw new Error(journeyConfigTexts.alerts.notFound);
      }
      setSource(config);
      setDraft(toDraft(config));
    } catch (nextError) {
      setSource(null);
      setDraft(null);
      setError(getErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, [configId, project]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateDraft(patch: Partial<JourneyConfigDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
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
      if (updated.gameType !== "journey") {
        throw new Error(journeyConfigTexts.alerts.notFound);
      }
      setSource(updated);
      setDraft(toDraft(updated));
      return true;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
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
