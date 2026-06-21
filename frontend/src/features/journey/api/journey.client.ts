import { normalizeJourneyGame } from "../engine";
import type { JourneyMoveInput, JourneyPersistedGame, JourneyPersistedGameDto } from "../types";

const JOURNEY_API_BASE_URL = "/api/journey";

interface JourneyApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface JourneyApiErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

type JourneyApiResponse<T> = JourneyApiSuccessResponse<T> | JourneyApiErrorResponse;

async function requestJourneyApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${JOURNEY_API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const responseBody = (await response.json().catch(() => null)) as JourneyApiResponse<T> | null;

  if (!response.ok || !responseBody?.success) {
    const message =
      responseBody && responseBody.success === false
        ? responseBody.error || responseBody.message || "Journey request failed"
        : `Journey request failed with status ${response.status}`;

    throw new Error(message);
  }

  return responseBody.data;
}

function normalizeJourneyGameResponse(game: JourneyPersistedGameDto): JourneyPersistedGame {
  const normalizedGame = normalizeJourneyGame(game);

  if (!normalizedGame || !game.id) {
    throw new Error("Journey response normalization failed");
  }

  return {
    ...normalizedGame,
    id: game.id,
  };
}

export function createJourneyGameRequest(payload: {
  nicknames: string[];
  configId: string;
}) {
  return requestJourneyApi<JourneyPersistedGameDto>("/games", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeJourneyGameResponse);
}

export function getJourneyGameByIdRequest(gameId: string) {
  return requestJourneyApi<JourneyPersistedGameDto>(`/games/${gameId}`).then(normalizeJourneyGameResponse);
}

export function submitJourneyRoundRequest(
  gameId: string,
  payload: {
    moves: JourneyMoveInput[];
    skippedPlayerIds?: string[];
  },
) {
  return requestJourneyApi<JourneyPersistedGameDto>(`/games/${gameId}/rounds`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeJourneyGameResponse);
}

export function removeJourneyPlayerRequest(gameId: string, playerId: string) {
  return requestJourneyApi<JourneyPersistedGameDto>(`/games/${gameId}/players/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
  }).then(normalizeJourneyGameResponse);
}

export function deleteJourneyGameRequest(gameId: string) {
  return requestJourneyApi<unknown>(`/games/${gameId}`, {
    method: "DELETE",
  });
}

export function parseJourneyPlayersRequest(text: string, djName: string) {
  return requestJourneyApi<string[]>("/parse/players", {
    method: "POST",
    body: JSON.stringify({
      text,
      djName,
    }),
  });
}

export function parseJourneyMovesRequest(text: string) {
  return requestJourneyApi<Record<string, number>>("/parse/moves", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
