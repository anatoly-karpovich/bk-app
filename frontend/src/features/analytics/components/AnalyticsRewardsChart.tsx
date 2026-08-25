import { Box, Typography } from "@mui/material";
import type { AnalyticsOverview, AnalyticsResources } from "../types";

const colors = ["#4f46e5", "#0891b2", "#8b5cf6"];

function calendarDays(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  const end = new Date(to);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

interface AnalyticsRewardsChartProps {
  overview: AnalyticsOverview;
  resources: AnalyticsResources;
}

function getNiceMaximum(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatTickDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("ru-RU", { day: "numeric" });
}

export default function AnalyticsRewardsChart({ overview, resources }: AnalyticsRewardsChartProps) {
  const visibleResources = resources.resources.filter((entry) => entry.rewards.total !== 0).slice(0, 3);
  const days = calendarDays(overview.period.from, overview.period.to);
  const dailyRewards = new Map(overview.rewardsByDay.map((entry) => [entry.date, entry.rewardsByResource]));
  const series = visibleResources.map((entry, index) => ({
    ...entry,
    color: colors[index],
    values: days.map((date) => dailyRewards.get(date)?.find((item) => item.resourceId === entry.resource.id)?.rewards.total ?? 0),
  }));
  const max = getNiceMaximum(Math.max(1, ...series.flatMap((entry) => entry.values)));
  const labelStep = days.length <= 31 ? 1 : days.length <= 60 ? 2 : 3;
  const tickIndexes = days.map((_, index) => index).filter((index) => index % labelStep === 0 || index === days.length - 1);
  const chartLeft = 48;
  const chartRight = 790;
  const chartTop = 16;
  const chartBottom = 194;
  const chartWidth = chartRight - chartLeft;
  const groupWidth = chartWidth / Math.max(days.length, 1);
  const barGap = 2;
  const barWidth = Math.max(1, Math.min(16, (groupWidth - 6 - barGap * (series.length - 1)) / Math.max(series.length, 1)));

  if (!series.length) {
    return <Typography color="text.secondary" sx={{ py: 7, textAlign: "center" }}>За выбранный период награды не выдавались.</Typography>;
  }

  return (
    <>
      <Box sx={{ height: 286, border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.md, p: 1.5, overflow: "hidden" }}>
        <svg viewBox="0 0 800 240" role="img" aria-label="Столбчатый график выданных наград по дням" width="100%" height="100%" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartBottom - (chartBottom - chartTop) * ratio;
            return (
              <g key={ratio}>
                <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="#e5e7eb" strokeDasharray="4 6" />
                <text x={chartLeft - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{Math.round(max * ratio)}</text>
              </g>
            );
          })}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#cbd5e1" />
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#cbd5e1" />
          {series.flatMap((entry, seriesIndex) => entry.values.map((value, dayIndex) => {
            const groupCenter = chartLeft + groupWidth * dayIndex + groupWidth / 2;
            const x = groupCenter - ((series.length * barWidth + (series.length - 1) * barGap) / 2) + seriesIndex * (barWidth + barGap);
            const height = (value / max) * (chartBottom - chartTop);
            return (
              <rect key={`${entry.resource.id}-${days[dayIndex]}`} x={x} y={chartBottom - height} width={barWidth} height={height} rx="2" fill={entry.color}>
                <title>{`${formatTickDate(days[dayIndex])}: ${value}`}</title>
              </rect>
            );
          }))}
          {tickIndexes.map((index) => {
            const x = chartLeft + groupWidth * index + groupWidth / 2;
            return <text key={days[index]} x={x} y="218" textAnchor="middle" fill="#64748b" fontSize="10">{formatDayLabel(days[index])}</text>;
          })}
        </svg>
      </Box>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1.25 }}>
        {series.map((entry) => (
          <Typography key={entry.resource.id} variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: entry.color }} />
            {entry.resource.name}
          </Typography>
        ))}
      </Box>
    </>
  );
}
