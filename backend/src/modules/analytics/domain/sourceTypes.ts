export const ANALYTICS_SOURCE_KINDS = ["game", "quiz_event", "activity"] as const;
export type AnalyticsSourceKind = (typeof ANALYTICS_SOURCE_KINDS)[number];

export const ANALYTICS_GAME_SOURCE_TYPES = ["journey", "battleships", "lotto", "lotto_bingo", "tournament"] as const;
export const ANALYTICS_QUIZ_EVENT_SOURCE_TYPES = ["quiz"] as const;
export const ANALYTICS_ACTIVITY_SOURCE_TYPES = [
  "journey",
  "battleships",
  "lotto",
  "lotto_bingo",
  "quiz",
  "memes",
  "forum_quiz",
  "tournament",
  "forecast_contest",
  "contest",
] as const;
export const ANALYTICS_SOURCE_TYPES = [
  "journey",
  "battleships",
  "lotto",
  "lotto_bingo",
  "quiz",
  "memes",
  "forum_quiz",
  "tournament",
  "forecast_contest",
  "contest",
] as const;
export type AnalyticsSourceType = (typeof ANALYTICS_SOURCE_TYPES)[number];

const sourceTypesByKind: Readonly<Record<AnalyticsSourceKind, ReadonlyArray<AnalyticsSourceType>>> = {
  game: ANALYTICS_GAME_SOURCE_TYPES,
  quiz_event: ANALYTICS_QUIZ_EVENT_SOURCE_TYPES,
  activity: ANALYTICS_ACTIVITY_SOURCE_TYPES,
};

/** Returns whether a canonical source kind may publish into an analytics category. */
export function isAnalyticsSourcePair(kind: AnalyticsSourceKind, type: AnalyticsSourceType): boolean {
  return sourceTypesByKind[kind].includes(type);
}

export interface AnalyticsSourceKey {
  projectId: string;
  kind: AnalyticsSourceKind;
  sourceId: string;
}

/**
 * Produces a collision-safe in-memory key for a fact uniquely scoped to a project.
 * MongoDB uniqueness is enforced by the corresponding compound index.
 */
export function createAnalyticsSourceKey({ projectId, kind, sourceId }: AnalyticsSourceKey): string {
  return JSON.stringify([projectId, kind, sourceId]);
}
