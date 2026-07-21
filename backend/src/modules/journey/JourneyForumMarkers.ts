export const JOURNEY_GAME_STARTED_MARKER = "==================== Игра началась ====================";

const JOURNEY_FORUM_MARKER_PATTERN = /^\s*=+\s*(?<label>Игра\s+началась|Ход\s+(?<roundIndex>\d+))\s*=+(?:\s|$)/iu;

export interface JourneyForumMarker {
  kind: "game_started" | "round";
  roundIndex: number | null;
}

export function buildJourneyRoundMarker(roundIndex: number): string {
  return `==================== Ход ${roundIndex} ====================`;
}

export function parseJourneyForumMarker(text: string): JourneyForumMarker | null {
  const match = text.match(JOURNEY_FORUM_MARKER_PATTERN);

  if (!match?.groups?.label) {
    return null;
  }

  const roundIndex = match.groups.roundIndex;
  return roundIndex
    ? { kind: "round", roundIndex: Number.parseInt(roundIndex, 10) }
    : { kind: "game_started", roundIndex: null };
}
