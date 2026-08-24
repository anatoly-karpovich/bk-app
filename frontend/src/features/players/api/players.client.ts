import { apiClient } from "../../../lib/apiClient";
import type { ProjectPlayer } from "../types";

function getProjectPlayersApiBaseUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/players`;
}

export async function getProjectPlayersRequest(projectId: string): Promise<ProjectPlayer[]> {
  return await apiClient.get<ProjectPlayer[]>(getProjectPlayersApiBaseUrl(projectId));
}
