import { apiClient } from "../../../lib/apiClient";
import { lottoBingoViewMapper } from "../mappers/LottoBingoViewMapper";
import type { LottoBingoGameView, LottoBingoPageModel, LottoBingoSavedGame } from "../types";

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/lotto-bingo/games`;
const map = (view: LottoBingoGameView): LottoBingoPageModel => lottoBingoViewMapper.toPageModel(view);

export const lottoBingoApi = {
  list: (projectId: string) => apiClient.get<LottoBingoSavedGame[]>(base(projectId)),
  latest: async (projectId: string) => map(await apiClient.get<LottoBingoGameView>(`${base(projectId)}/latest`)),
  get: async (projectId: string, gameId: string) => map(await apiClient.get<LottoBingoGameView>(`${base(projectId)}/${encodeURIComponent(gameId)}`)),
  create: async (projectId: string, gameConfigId: string) => map(await apiClient.post<LottoBingoGameView>(base(projectId), { gameConfigId })),
  addPlayer: async (projectId: string, gameId: string, nickname: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/players`, { nickname, expectedRevision })),
  removePlayer: async (projectId: string, gameId: string, playerId: string, expectedRevision: number) => map(await apiClient.deleteWithBody<LottoBingoGameView>(`${base(projectId)}/${gameId}/players/${playerId}`, { expectedRevision })),
  start: async (projectId: string, gameId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/start`, { expectedRevision })),
  draw: async (projectId: string, gameId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/draws`, { expectedRevision })),
  undo: async (projectId: string, gameId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/draws/undo`, { expectedRevision })),
  confirmWinners: async (projectId: string, gameId: string, playerIds: string[], expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/winners`, { playerIds, expectedRevision })),
  disqualify: async (projectId: string, gameId: string, playerId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/players/${playerId}/disqualify`, { expectedRevision })),
  restore: async (projectId: string, gameId: string, playerId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/players/${playerId}/restore`, { expectedRevision })),
  finalize: async (projectId: string, gameId: string, expectedRevision: number) => map(await apiClient.post<LottoBingoGameView>(`${base(projectId)}/${gameId}/finalize`, { expectedRevision })),
  delete: (projectId: string, gameId: string, expectedRevision: number) => apiClient.deleteWithBody<void>(`${base(projectId)}/${gameId}`, { expectedRevision }),
  eventsUrl: (projectId: string, gameId: string) => `${import.meta.env.VITE_API_BASE_URL ?? ""}${base(projectId)}/${encodeURIComponent(gameId)}/events`,
};
