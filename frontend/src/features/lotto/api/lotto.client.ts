import { apiClient } from "../../../lib/apiClient";
import type { LottoPersistedGame, LottoSavedGameSummary } from "../types";

const LOTTO_API_BASE_URL = "/api/lotto";

export async function createLottoGameRequest(payload: {
  players: Array<{
    nickname: string;
    cardNumbers: number[];
  }>;
  configId: string;
  djName?: string;
}): Promise<LottoPersistedGame> {
  return await apiClient.post<LottoPersistedGame>(`${LOTTO_API_BASE_URL}/games`, payload);
}

export async function getLottoGameByIdRequest(gameId: string): Promise<LottoPersistedGame> {
  return await apiClient.get<LottoPersistedGame>(`${LOTTO_API_BASE_URL}/games/${gameId}`);
}

export async function listLottoGamesRequest(): Promise<LottoSavedGameSummary[]> {
  return await apiClient.get<LottoSavedGameSummary[]>(`${LOTTO_API_BASE_URL}/games`);
}

export async function drawLottoNumberRequest(gameId: string): Promise<LottoPersistedGame> {
  return await apiClient.post<LottoPersistedGame>(`${LOTTO_API_BASE_URL}/games/${gameId}/draw`);
}

export async function removeLottoPlayerRequest(gameId: string, playerId: string): Promise<LottoPersistedGame> {
  return await apiClient.delete<LottoPersistedGame>(
    `${LOTTO_API_BASE_URL}/games/${gameId}/players/${encodeURIComponent(playerId)}`,
  );
}

export async function deleteLottoGameRequest(gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${LOTTO_API_BASE_URL}/games/${gameId}`);
}
