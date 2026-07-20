import { journeyGameViewMapper } from "../mappers/JourneyGameViewMapper";
import type { JourneyGameView, JourneyMoveInput, JourneyPageGame, JourneySavedGameSummary } from "../types";
import { apiClient } from "../../../lib/apiClient";

const JOURNEY_API_BASE_URL = "/api/journey";

function getProjectJourneyApiBaseUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/journey`;
}

export async function createJourneyGameRequest(payload: {
  projectId: string;
  gameConfigId: string;
  nicknames: string[];
  djName?: string;
}): Promise<JourneyPageGame> {
  const { projectId, ...body } = payload;
  const game = await apiClient.post<JourneyGameView>(
    `${getProjectJourneyApiBaseUrl(projectId)}/games`,
    body,
  );
  return journeyGameViewMapper.toPageGame(game);
}

export async function getJourneyGameByIdRequest(projectId: string, gameId: string): Promise<JourneyPageGame> {
  const game = await apiClient.get<JourneyGameView>(`${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}`);
  return journeyGameViewMapper.toPageGame(game);
}

export async function listJourneyGamesRequest(projectId: string): Promise<JourneySavedGameSummary[]> {
  return await apiClient.get<JourneySavedGameSummary[]>(`${getProjectJourneyApiBaseUrl(projectId)}/games`);
}

export async function submitJourneyRoundRequest(
  projectId: string,
  gameId: string,
  payload: {
    moves: JourneyMoveInput[];
    skippedPlayerIds?: string[];
  },
): Promise<JourneyPageGame> {
  const game = await apiClient.post<JourneyGameView>(`${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}/rounds`, payload);
  return journeyGameViewMapper.toPageGame(game);
}

export async function removeJourneyPlayerRequest(projectId: string, gameId: string, playerId: string): Promise<JourneyPageGame> {
  const game = await apiClient.delete<JourneyGameView>(
    `${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}/players/${encodeURIComponent(playerId)}`,
  );
  return journeyGameViewMapper.toPageGame(game);
}

export async function deleteJourneyGameRequest(projectId: string, gameId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}`);
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
