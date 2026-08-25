import type { AnalyticsQuery } from "../types";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsPeriodPreset {
  label: string;
  range: AnalyticsDateRange;
}

/** Rolling range of the last `days` days, ending at the start of tomorrow (UTC, `to` exclusive). */
export function dateRange(days: number): AnalyticsDateRange {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Calendar month relative to now (`offset` 0 = current, -1 = previous), `to` exclusive. */
export function monthRange(offset: number): AnalyticsDateRange {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function formatPeriod(from: string, to: string): string {
  const start = new Date(from);
  const end = new Date(new Date(to).getTime() - 1);
  const format = (value: Date) => value.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return `${format(start)} — ${format(end)}`;
}

export function isSamePeriod(query: AnalyticsQuery, range: AnalyticsDateRange): boolean {
  return query.from === range.from && query.to === range.to;
}

export function periodPresets(): AnalyticsPeriodPreset[] {
  return [
    { label: "Этот месяц", range: monthRange(0) },
    { label: "Прошлый месяц", range: monthRange(-1) },
    { label: "30 дней", range: dateRange(30) },
    { label: "90 дней", range: dateRange(90) },
  ];
}

/** The inclusive last day (`YYYY-MM-DD`) represented by an exclusive-`to` query bound. */
export function queryToInclusiveTo(to: string): string {
  return new Date(new Date(to).getTime() - 1).toISOString().slice(0, 10);
}

/** Convert inclusive custom date inputs (`YYYY-MM-DD`) into an exclusive-`to` query range. */
export function customRangeToQuery(from: string, to: string): AnalyticsDateRange {
  const exclusiveTo = new Date(`${to}T00:00:00.000Z`);
  exclusiveTo.setUTCDate(exclusiveTo.getUTCDate() + 1);
  return { from: `${from}T00:00:00.000Z`, to: exclusiveTo.toISOString() };
}
