import { useCallback, useEffect, useMemo, useState } from "react";
import { getProjectsRequest, updateProjectRequest } from "../api/projects.client";
import { loadSelectedProjectId, saveSelectedProjectId } from "../storage";
import type { Project, ProjectMutationInput } from "../types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project request failed";
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => loadSelectedProjectId() ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const updateProject = useCallback(async (projectId: string, input: ProjectMutationInput): Promise<Project | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedProject = await updateProjectRequest(projectId, input);
      setProjects((currentProjects) => currentProjects.map((project) => project.id === updatedProject.id ? updatedProject : project));
      return updatedProject;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      return null;
    } finally {
      setIsSaving(false);
    }
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
    isSaving,
    error,
    actions: {
      loadProjects,
      selectProject,
      updateProject,
    },
  };
}
