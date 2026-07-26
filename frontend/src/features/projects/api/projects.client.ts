import { apiClient } from "../../../lib/apiClient";
import type {
  AnyGameConfig,
  BattleshipsGameConfig,
  CreateGameConfigInput,
  GameType,
  JourneyGameConfig,
  LottoGameConfig,
  Project,
  ProjectMutationInput,
  UpdateGameConfigInput,
} from "../types";
import {
  BATTLESHIPS_GAME_CONFIG_STORAGE_KEY,
  JOURNEY_GAME_CONFIG_STORAGE_KEY,
  LOTTO_GAME_CONFIG_STORAGE_KEY,
} from "../constants";

const PROJECTS_API_BASE_URL = "/api/projects";

export async function getProjectsRequest(): Promise<Project[]> {
  return await apiClient.get<Project[]>(PROJECTS_API_BASE_URL);
}

export async function createProjectRequest(input: ProjectMutationInput): Promise<Project> {
  return await apiClient.post<Project>(PROJECTS_API_BASE_URL, input);
}

export async function updateProjectRequest(projectId: string, input: ProjectMutationInput): Promise<Project> {
  return await apiClient.put<Project>(`${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}`, input);
}

export async function deleteProjectRequest(projectId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(`${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}`);
}

export async function createGameConfigRequest(projectId: string, input: CreateGameConfigInput): Promise<AnyGameConfig> {
  return await apiClient.post<AnyGameConfig>(`${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs`, input);
}

export async function getGameConfigRequest(projectId: string, gameConfigId: string): Promise<AnyGameConfig> {
  return await apiClient.get<AnyGameConfig>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs/${encodeURIComponent(gameConfigId)}`,
  );
}

export async function updateGameConfigRequest(
  projectId: string,
  gameConfigId: string,
  input: UpdateGameConfigInput,
): Promise<AnyGameConfig> {
  return await apiClient.put<AnyGameConfig>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs/${encodeURIComponent(gameConfigId)}`,
    input,
  );
}

export async function deleteGameConfigRequest(projectId: string, gameConfigId: string): Promise<unknown> {
  return await apiClient.delete<unknown>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs/${encodeURIComponent(gameConfigId)}`,
  );
}

export async function getJourneyGameConfigsRequest(projectId: string): Promise<JourneyGameConfig[]> {
  return await apiClient.get<JourneyGameConfig[]>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs?gameType=journey`,
  );
}

export async function getBattleshipsGameConfigsRequest(projectId: string): Promise<BattleshipsGameConfig[]> {
  return await apiClient.get<BattleshipsGameConfig[]>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs?gameType=battleships`,
  );
}

export async function getLottoGameConfigsRequest(projectId: string): Promise<LottoGameConfig[]> {
  return await apiClient.get<LottoGameConfig[]>(
    `${PROJECTS_API_BASE_URL}/${encodeURIComponent(projectId)}/game-configs?gameType=lotto`,
  );
}

export function getSelectedGameConfigStorageKey(gameType: GameType): string {
  switch (gameType) {
    case "journey":
      return JOURNEY_GAME_CONFIG_STORAGE_KEY;
    case "battleships":
      return BATTLESHIPS_GAME_CONFIG_STORAGE_KEY;
    case "lotto":
      return LOTTO_GAME_CONFIG_STORAGE_KEY;
  }
}
