export const ANALYTICS_SOURCE_KINDS = ["game", "quiz_event"] as const;
export type AnalyticsSourceKind = (typeof ANALYTICS_SOURCE_KINDS)[number];

export const ANALYTICS_SOURCE_TYPES = ["journey", "battleships", "lotto", "lotto_bingo", "quiz"] as const;
export type AnalyticsSourceType = (typeof ANALYTICS_SOURCE_TYPES)[number];

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
