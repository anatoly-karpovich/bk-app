import type { JourneyMoveInput, JourneyPersistedGame, JourneySavedGameSummary } from "../types";
import { apiClient } from "../../../lib/apiClient";

const JOURNEY_API_BASE_URL = "/api/journey";

export async function createJourneyGameRequest(payload: {
  nicknames: string[];
  configId: string;
}): Promise<JourneyPersistedGame> {
  return await apiClient.post<JourneyPersistedGame>(`${JOURNEY_API_BASE_URL}/games`, payload);
}

export async function getJourneyGameByIdRequest(gameId: string): Promise<JourneyPersistedGame> {
  return await apiClient.get<JourneyPersistedGame>(`${JOURNEY_API_BASE_URL}/games/${gameId}`);
}

export async function listJourneyGamesRequest(): Promise<JourneySavedGameSummary[]> {
  return await apiClient.get<JourneySavedGameSummary[]>(`${JOURNEY_API_BASE_URL}/games`);
}

export async function submitJourneyRoundRequest(
  gameId: string,
  payload: {
    moves: JourneyMoveInput[];
    skippedPlayerIds?: string[];
  },
): Promise<JourneyPersistedGame> {
  return await apiClient.post<JourneyPersistedGame>(`${JOURNEY_API_BASE_URL}/games/${gameId}/rounds`, payload);
}

export async function removeJourneyPlayerRequest(gameId: string, playerId: string): Promise<JourneyPersistedGame> {
  return await apiClient.delete<JourneyPersistedGame>(
    `${JOURNEY_API_BASE_URL}/games/${gameId}/players/${encodeURIComponent(playerId)}`,
  );
}

export async function deleteJourneyGameRequest(gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${JOURNEY_API_BASE_URL}/games/${gameId}`);
}

export async function parseJourneyPlayersRequest(text: string, djName: string): Promise<string[]> {
  return await apiClient.post<string[]>(`${JOURNEY_API_BASE_URL}/parse/players`, {
    text,
    djName,
  });
}

export async function parseJourneyMovesRequest(text: string): Promise<Record<string, number>> {
  return await apiClient.post<Record<string, number>>(`${JOURNEY_API_BASE_URL}/parse/moves`, { text });
}
