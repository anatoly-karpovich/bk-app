import { apiClient } from "../../../lib/apiClient";
import type { LottoPersistedGame, LottoSavedGameSummary } from "../types";

function getProjectLottoApiBaseUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/lotto`;
}

export async function createLottoGameRequest(payload: {
  projectId: string;
  players: Array<{
    nickname: string;
    cardNumbers: number[];
  }>;
  gameConfigId: string;
}): Promise<LottoPersistedGame> {
  const { projectId, ...body } = payload;
  return await apiClient.post<LottoPersistedGame>(
    `${getProjectLottoApiBaseUrl(projectId)}/games`,
    body,
  );
}

export async function getLottoGameByIdRequest(projectId: string, gameId: string): Promise<LottoPersistedGame> {
  return await apiClient.get<LottoPersistedGame>(`${getProjectLottoApiBaseUrl(projectId)}/games/${gameId}`);
}

export async function listLottoGamesRequest(projectId: string): Promise<LottoSavedGameSummary[]> {
  return await apiClient.get<LottoSavedGameSummary[]>(`${getProjectLottoApiBaseUrl(projectId)}/games`);
}

export async function drawLottoNumberRequest(projectId: string, gameId: string): Promise<LottoPersistedGame> {
  return await apiClient.post<LottoPersistedGame>(`${getProjectLottoApiBaseUrl(projectId)}/games/${gameId}/draw`);
}

export async function removeLottoPlayerRequest(projectId: string, gameId: string, playerId: string): Promise<LottoPersistedGame> {
  return await apiClient.delete<LottoPersistedGame>(
    `${getProjectLottoApiBaseUrl(projectId)}/games/${gameId}/players/${encodeURIComponent(playerId)}`,
  );
}

export async function deleteLottoGameRequest(projectId: string, gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${getProjectLottoApiBaseUrl(projectId)}/games/${gameId}`);
}
