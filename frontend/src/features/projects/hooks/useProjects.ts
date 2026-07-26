import { useCallback, useEffect, useMemo, useState } from "react";
import { getProjectsRequest } from "../api/projects.client";
import { loadSelectedProjectId, saveSelectedProjectId } from "../storage";
import type { Project } from "../types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project request failed";
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => loadSelectedProjectId() ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProjects = await getProjectsRequest();
      setProjects(nextProjects);

      const storedProjectId = loadSelectedProjectId();
      const fallbackProjectId = nextProjects[0]?.id ?? "";
      const resolvedProjectId =
        (storedProjectId && nextProjects.some((project) => project.id === storedProjectId) && storedProjectId) || fallbackProjectId;

      setSelectedProjectId(resolvedProjectId);

      if (resolvedProjectId) {
        saveSelectedProjectId(resolvedProjectId);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback((nextProjectId: string) => {
    setSelectedProjectId(nextProjectId);
    saveSelectedProjectId(nextProjectId);
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId],
  );

  return {
    projects,
    selectedProjectId,
    selectedProject,
    isLoading,
    error,
    actions: {
      loadProjects,
      selectProject,
    },
  };
}
