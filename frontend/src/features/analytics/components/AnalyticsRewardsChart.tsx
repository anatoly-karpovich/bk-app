import { Box, Typography } from "@mui/material";
import type { AnalyticsOverview, AnalyticsPlayerDetails, AnalyticsResources } from "../types";
import { getResourceColor } from "./analyticsColors";

function calendarDays(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

interface AnalyticsRewardsChartProps {
  overview?: AnalyticsOverview;
  resources?: AnalyticsResources;
  playerDetails?: AnalyticsPlayerDetails;
}

function getNiceMaximum(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatTickDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function AnalyticsRewardsChart({ overview, resources, playerDetails }: AnalyticsRewardsChartProps) {
  const period = playerDetails?.period ?? overview?.period;
  const days = period ? calendarDays(period.from, period.to) : [];
  const series = playerDetails
    ? [{
        resource: playerDetails.resource.resource,
        color: getResourceColor(0),
        values: days.map((date) => playerDetails.rewardsByDay.find((entry) => entry.date === date)?.rewards.total ?? 0),
      }]
    : (resources?.resources.filter((entry) => entry.rewards.total !== 0).slice(0, 3).map((entry, index) => {
        const dailyRewards = new Map(overview?.rewardsByDay.map((day) => [day.date, day.rewardsByResource]));
        return {
          resource: entry.resource,
          color: getResourceColor(index),
          values: days.map((date) => dailyRewards.get(date)?.find((item) => item.resourceId === entry.resource.id)?.rewards.total ?? 0),
        };
      }) ?? []);
  const max = getNiceMaximum(Math.max(1, ...series.flatMap((entry) => entry.values)));
  const labelStep = days.length <= 14 ? 1 : days.length <= 31 ? 4 : days.length <= 60 ? 7 : 14;
  const tickIndexes = days.map((_, index) => index).filter((index) => index % labelStep === 0 || index === days.length - 1);
  const yAxisLabel = playerDetails
    ? `Получено, ${series[0].resource.label}`
    : "Выдано, количество";
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
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
        {yAxisLabel}
      </Typography>
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
            <title>{`${formatTickDate(days[dayIndex])}: ${value} ${entry.resource.label}`}</title>
              </rect>
            );
          }))}
          {tickIndexes.map((index) => {
            const x = chartLeft + groupWidth * index + groupWidth / 2;
            return <text key={days[index]} x={x} y="218" textAnchor="middle" fill="#64748b" fontSize="10">{formatTickDate(days[index])}</text>;
          })}
        </svg>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, textAlign: "center" }}>
        Дата проведения
      </Typography>
      <Box sx={{ display: series.length > 1 ? "flex" : "none", gap: 2, flexWrap: "wrap", mt: 1.25 }}>
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
