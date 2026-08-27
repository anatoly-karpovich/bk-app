export const ANALYTICS_OCCURRENCE_DATE_SOURCES = ["conducted_on", "finalized_at"] as const;
export type AnalyticsOccurrenceDateSource = (typeof ANALYTICS_OCCURRENCE_DATE_SOURCES)[number];

/** Validates a timezone-free ISO calendar date. */
export function isAnalyticsCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Converts a persisted UTC timestamp to its UTC calendar-date fallback. */
export function utcDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid analytics finalization timestamp");
  return date.toISOString().slice(0, 10);
}

/** Chooses an explicit conducted date when present, otherwise a technical finalization-date fallback. */
export function resolveAnalyticsOccurrenceDate(
  conductedOn: string | null | undefined,
  finalizedAt: string,
): { occurredOn: string; occurrenceDateSource: AnalyticsOccurrenceDateSource } {
  if (conductedOn !== null && conductedOn !== undefined) {
    if (!isAnalyticsCalendarDate(conductedOn)) throw new Error("Invalid analytics conducted date");
    return { occurredOn: conductedOn, occurrenceDateSource: "conducted_on" };
  }
  return { occurredOn: utcDateFromTimestamp(finalizedAt), occurrenceDateSource: "finalized_at" };
}
