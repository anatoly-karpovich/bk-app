import { useCallback, useEffect, useState } from "react";
import { activitiesApiClient } from "../api/activities.client";
import { cloneActivityDraft, createActivityResultDraft, toActivityResultInput } from "../activityResult.helpers";
import type { ActivityResult, ActivityResultDraft, ActivityTypeSettings } from "../types";

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Не удалось сохранить активность.";
}

export function useActivityResult(
  projectId: string | undefined,
  activityId: string | undefined,
  activityTypes: readonly ActivityTypeSettings[],
) {
  const [source, setSource] = useState<ActivityResult | null>(null);
  const [draft, setDraft] = useState<ActivityResultDraft | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(activityId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !activityId) return;
    setIsLoading(true);
    setError(null);
    try {
      const activity = await activitiesApiClient.get(projectId, activityId);
      setSource(activity);
      setDraft(cloneActivityDraft(activity));
    } catch (cause) {
      setSource(null);
      setDraft(null);
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [activityId, projectId]);

  useEffect(() => {
    if (activityId) {
      void load();
      return;
    }
    setSource(null);
    setDraft(createActivityResultDraft(activityTypes));
    setError(null);
    setIsLoading(false);
  }, [activityId, activityTypes, load]);

  const save = useCallback(async (): Promise<ActivityResult | null> => {
    if (!projectId || !draft) return null;
    setIsSaving(true);
    setError(null);
    try {
      const saved = source
        ? await activitiesApiClient.update(projectId, source.id, toActivityResultInput(draft), source.revision)
        : await activitiesApiClient.create(projectId, toActivityResultInput(draft));
      setSource(saved);
      setDraft(cloneActivityDraft(saved));
      return saved;
    } catch (cause) {
      setError(errorMessage(cause));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draft, projectId, source]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!projectId || !source) return false;
    setIsSaving(true);
    setError(null);
    try {
      await activitiesApiClient.delete(projectId, source.id, source.revision);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, source]);

  const reset = useCallback(() => {
    if (source) setDraft(cloneActivityDraft(source));
    else setDraft(createActivityResultDraft(activityTypes));
    setError(null);
  }, [activityTypes, source]);

  return { source, draft, setDraft, isLoading, isSaving, error, load, save, remove, reset };
}
