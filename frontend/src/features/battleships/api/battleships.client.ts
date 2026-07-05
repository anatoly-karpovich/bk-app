import { apiClient } from "../../../lib/apiClient";
import type { BattleshipsPersistedGame, BattleshipsSavedGameSummary } from "../types";

const BATTLESHIPS_API_BASE_URL = "/api/battleships";

export async function createBattleshipsGameRequest(payload: {
  playerName: string;
  configId: string;
  djName?: string;
}): Promise<BattleshipsPersistedGame> {
  return await apiClient.post<BattleshipsPersistedGame>(`${BATTLESHIPS_API_BASE_URL}/games`, payload);
}

export async function getBattleshipsGameByIdRequest(gameId: string): Promise<BattleshipsPersistedGame> {
  return await apiClient.get<BattleshipsPersistedGame>(`${BATTLESHIPS_API_BASE_URL}/games/${gameId}`);
}

export async function listBattleshipsGamesRequest(): Promise<BattleshipsSavedGameSummary[]> {
  return await apiClient.get<BattleshipsSavedGameSummary[]>(`${BATTLESHIPS_API_BASE_URL}/games`);
}

export async function submitBattleshipsShotRequest(
  gameId: string,
  payload: {
    row: number;
    column: number;
  },
): Promise<BattleshipsPersistedGame> {
  return await apiClient.post<BattleshipsPersistedGame>(`${BATTLESHIPS_API_BASE_URL}/games/${gameId}/shots`, payload);
}

export async function undoBattleshipsShotRequest(gameId: string): Promise<BattleshipsPersistedGame> {
  return await apiClient.post<BattleshipsPersistedGame>(`${BATTLESHIPS_API_BASE_URL}/games/${gameId}/shots/undo`);
}

export async function deleteBattleshipsGameRequest(gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${BATTLESHIPS_API_BASE_URL}/games/${gameId}`);
}
