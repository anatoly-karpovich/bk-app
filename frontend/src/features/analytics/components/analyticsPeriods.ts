import type { AnalyticsQuery } from "../types";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsPeriodPreset {
  label: string;
  range: AnalyticsDateRange;
}

function toCalendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(value: Date, days: number): Date {
  const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Inclusive calendar range for the last `days` days, including today. */
export function dateRange(days: number): AnalyticsDateRange {
  const today = new Date();
  return { from: toCalendarDate(addLocalDays(today, -(days - 1))), to: toCalendarDate(today) };
}

/** Inclusive calendar month relative to now (`offset` 0 = current, -1 = previous). */
export function monthRange(offset: number): AnalyticsDateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toCalendarDate(from), to: toCalendarDate(to) };
}

export function formatPeriod(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
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

/** Custom date inputs already use the inclusive Analytics query contract. */
export function customRangeToQuery(from: string, to: string): AnalyticsDateRange {
  return { from, to };
}
