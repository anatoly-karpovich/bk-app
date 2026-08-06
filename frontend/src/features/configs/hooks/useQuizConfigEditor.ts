import { useCallback, useEffect, useState } from "react";
import type { Project } from "../../projects/types";
import type { QuizConfig } from "../../utilities/quizzes/types";
import { quizConfigsApi } from "../api/quizConfigs.client";

interface QuizConfigEditorMessages {
  loadFailed: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useQuizConfigEditor(
  project: Project | null,
  configId: string | undefined,
  messages: QuizConfigEditorMessages,
) {
  const [source, setSource] = useState<QuizConfig | null>(null);
  const [draft, setDraft] = useState<QuizConfig | null>(null);
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
      const config = await quizConfigsApi.get(project.id, configId);
      setSource(config);
      setDraft(structuredClone(config));
    } catch (cause) {
      setSource(null);
      setDraft(null);
      setError(getErrorMessage(cause, messages.loadFailed));
    } finally {
      setIsLoading(false);
    }
  }, [configId, messages.loadFailed, project]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateDraft(patch: Partial<QuizConfig>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function reset() {
    if (source) {
      setDraft(structuredClone(source));
      setError(null);
    }
  }

  async function save(): Promise<QuizConfig | null> {
    if (!project || !source || !draft) {
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await quizConfigsApi.update(project.id, source.id, draft);
      setSource(saved);
      setDraft(structuredClone(saved));
      return saved;
    } catch (cause) {
      setError(getErrorMessage(cause, messages.loadFailed));
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
    actions: { load, reset, save, updateDraft },
  };
}
