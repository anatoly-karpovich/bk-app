import { journeyGameViewMapper } from "../mappers/JourneyGameViewMapper";
import type {
  JourneyForumStateMessage,
  JourneyForumMovesPreview,
  JourneyGameView,
  JourneyMoveInput,
  JourneyPageGame,
  JourneySavedGameSummary,
} from "../types";
import { apiClient } from "../../../lib/apiClient";

const JOURNEY_API_BASE_URL = "/api/journey";

function getProjectJourneyApiBaseUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/journey`;
}

export async function createJourneyGameRequest(payload: {
  projectId: string;
  gameConfigId: string;
  nicknames: string[];
  forumTopicId?: number;
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

export async function getJourneyForumStateRequest(
  projectId: string,
  gameId: string,
): Promise<JourneyForumStateMessage> {
  return await apiClient.get<JourneyForumStateMessage>(
    `${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}/forum-state`,
  );
}

export async function previewJourneyForumMovesRequest(
  projectId: string,
  gameId: string,
): Promise<JourneyForumMovesPreview> {
  return await apiClient.post<JourneyForumMovesPreview>(
    `${getProjectJourneyApiBaseUrl(projectId)}/games/${gameId}/forum-moves/preview`,
  );
}

export async function importJourneyPlayersFromForumRequest(
  projectId: string,
  payload: { forumTopicId: number },
): Promise<string[]> {
  return await apiClient.post<string[]>(`${getProjectJourneyApiBaseUrl(projectId)}/forum-players`, payload);
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

export async function parseJourneyPlayersRequest(projectId: string, text: string): Promise<string[]> {
  return await apiClient.post<string[]>(`${getProjectJourneyApiBaseUrl(projectId)}/parse/players`, { text });
}

export async function parseJourneyMovesRequest(text: string): Promise<Record<string, number>> {
  return await apiClient.post<Record<string, number>>(`${JOURNEY_API_BASE_URL}/parse/moves`, { text });
}
