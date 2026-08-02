import { apiClient } from "../../../lib/apiClient";
import type { BattleshipsPersistedGame, BattleshipsSavedGameSummary } from "../types";

function getProjectBattleshipsApiBaseUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/battleships`;
}

export async function createBattleshipsGameRequest(payload: {
  projectId: string;
  playerName: string;
  gameConfigId: string;
}): Promise<BattleshipsPersistedGame> {
  const { projectId, ...body } = payload;
  return await apiClient.post<BattleshipsPersistedGame>(
    `${getProjectBattleshipsApiBaseUrl(projectId)}/games`,
    body,
  );
}

export async function getBattleshipsGameByIdRequest(projectId: string, gameId: string): Promise<BattleshipsPersistedGame> {
  return await apiClient.get<BattleshipsPersistedGame>(`${getProjectBattleshipsApiBaseUrl(projectId)}/games/${gameId}`);
}

export async function listBattleshipsGamesRequest(projectId: string): Promise<BattleshipsSavedGameSummary[]> {
  return await apiClient.get<BattleshipsSavedGameSummary[]>(`${getProjectBattleshipsApiBaseUrl(projectId)}/games`);
}

export async function submitBattleshipsShotRequest(
  projectId: string,
  gameId: string,
  payload: {
    row: number;
    column: number;
  },
): Promise<BattleshipsPersistedGame> {
  return await apiClient.post<BattleshipsPersistedGame>(`${getProjectBattleshipsApiBaseUrl(projectId)}/games/${gameId}/shots`, payload);
}

export async function undoBattleshipsShotRequest(projectId: string, gameId: string): Promise<BattleshipsPersistedGame> {
  return await apiClient.post<BattleshipsPersistedGame>(`${getProjectBattleshipsApiBaseUrl(projectId)}/games/${gameId}/shots/undo`);
}

export async function deleteBattleshipsGameRequest(projectId: string, gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${getProjectBattleshipsApiBaseUrl(projectId)}/games/${gameId}`);
}
