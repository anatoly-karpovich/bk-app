import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Button, Checkbox, FormControlLabel, Menu, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import AppPillButton from "../../../components/ui/AppPillButton";
import type { AnalyticsQuery, AnalyticsSourceType } from "../types";
import AnalyticsSelectionPill from "./AnalyticsSelectionPill";

const sourceLabels: Record<AnalyticsSourceType, string> = {
  quiz: "Викторины",
  journey: "Карта Мародёров",
  lotto_bingo: "Лото Бинго",
  lotto: "Лото",
  battleships: "Морской бой",
};
const allSourceTypes: AnalyticsSourceType[] = ["quiz", "journey", "lotto_bingo", "lotto", "battleships"];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateRange(days: number) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { from: start.toISOString(), to: end.toISOString() };
}

function monthRange(offset: number) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatPeriod(from: string, to: string): string {
  const start = new Date(from);
  const end = new Date(new Date(to).getTime() - 1);
  return `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
}

function isSamePeriod(query: AnalyticsQuery, range: { from: string; to: string }): boolean {
  return query.from === range.from && query.to === range.to;
}

interface AnalyticsFiltersProps {
  query: AnalyticsQuery;
  onQueryChange: (query: AnalyticsQuery) => void;
}

export default function AnalyticsFilters({ query, onQueryChange }: AnalyticsFiltersProps) {
  const [periodAnchor, setPeriodAnchor] = useState<HTMLElement | null>(null);
  const [sourcesAnchor, setSourcesAnchor] = useState<HTMLElement | null>(null);
  const [customFrom, setCustomFrom] = useState(query.from.slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date(new Date(query.to).getTime() - 1).toISOString().slice(0, 10));

  function setPeriod(range: { from: string; to: string }) {
    onQueryChange({ ...query, ...range });
  }

  function toggleSourceType(sourceType: AnalyticsSourceType) {
    const sourceTypes = query.sourceTypes.includes(sourceType)
      ? query.sourceTypes.filter((item) => item !== sourceType)
      : [...query.sourceTypes, sourceType];
    if (sourceTypes.length) onQueryChange({ ...query, sourceTypes });
  }

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "stretch" }}>
      <Button
        variant="outlined"
        startIcon={<CalendarMonthRoundedIcon />}
        onClick={(event) => setPeriodAnchor(event.currentTarget)}
        color="inherit"
        sx={{
          justifyContent: "flex-start",
          minWidth: { md: 194 },
          px: 1.5,
          borderRadius: (theme) => theme.customRadii.control,
          borderColor: "divider",
          color: "text.primary",
          "&:hover": { borderColor: "rgba(79, 70, 229, 0.38)", backgroundColor: "rgba(79, 70, 229, 0.035)" },
        }}
      >
        <Box textAlign="left">
          <Typography component="span" display="block" variant="caption" color="text.secondary">Период</Typography>
          <Typography component="span" variant="body2" fontWeight={700}>{formatPeriod(query.from, query.to)}</Typography>
        </Box>
      </Button>
      <Button
        variant="outlined"
        startIcon={<TuneRoundedIcon />}
        onClick={(event) => setSourcesAnchor(event.currentTarget)}
        color="inherit"
        sx={{
          justifyContent: "flex-start",
          minWidth: { md: 164 },
          px: 1.5,
          borderRadius: (theme) => theme.customRadii.control,
          borderColor: "divider",
          color: "text.primary",
          "&:hover": { borderColor: "rgba(79, 70, 229, 0.38)", backgroundColor: "rgba(79, 70, 229, 0.035)" },
        }}
      >
        <Box textAlign="left">
          <Typography component="span" display="block" variant="caption" color="text.secondary">Проведения</Typography>
          <Typography component="span" variant="body2" fontWeight={700}>
            {query.sourceTypes.length === allSourceTypes.length ? "Все типы" : `${query.sourceTypes.length} типа`}
          </Typography>
        </Box>
      </Button>

      <Menu anchorEl={periodAnchor} open={Boolean(periodAnchor)} onClose={() => setPeriodAnchor(null)} PaperProps={{ sx: { p: 1.5, width: 360 } }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <AnalyticsSelectionPill selected={isSamePeriod(query, monthRange(0))} onClick={() => setPeriod(monthRange(0))}>Этот месяц</AnalyticsSelectionPill>
          <AnalyticsSelectionPill selected={isSamePeriod(query, monthRange(-1))} onClick={() => setPeriod(monthRange(-1))}>Прошлый месяц</AnalyticsSelectionPill>
          <AnalyticsSelectionPill selected={isSamePeriod(query, dateRange(30))} onClick={() => setPeriod(dateRange(30))}>30 дней</AnalyticsSelectionPill>
          <AnalyticsSelectionPill selected={isSamePeriod(query, dateRange(90))} onClick={() => setPeriod(dateRange(90))}>90 дней</AnalyticsSelectionPill>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField label="С" type="date" size="small" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="По" type="date" size="small" value={customTo} onChange={(event) => setCustomTo(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <AppPillButton
          size="small"
          variant="contained"
          sx={{ mt: 1.5 }}
          disabled={!customFrom || !customTo || customFrom > customTo}
          onClick={() => {
            const to = new Date(`${customTo}T00:00:00.000Z`);
            to.setUTCDate(to.getUTCDate() + 1);
            setPeriod({ from: `${customFrom}T00:00:00.000Z`, to: to.toISOString() });
            setPeriodAnchor(null);
          }}
        >
          Применить период
        </AppPillButton>
      </Menu>

      <Menu anchorEl={sourcesAnchor} open={Boolean(sourcesAnchor)} onClose={() => setSourcesAnchor(null)} PaperProps={{ sx: { p: 1 } }}>
        {allSourceTypes.map((sourceType) => (
          <FormControlLabel
            key={sourceType}
            sx={{ display: "flex", mx: 0, px: 1 }}
            control={<Checkbox checked={query.sourceTypes.includes(sourceType)} onChange={() => toggleSourceType(sourceType)} />}
            label={sourceLabels[sourceType]}
          />
        ))}
      </Menu>
    </Stack>
  );
}

export function AnalyticsQuickPeriodFilters({ query, onQueryChange }: AnalyticsFiltersProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [customFrom, setCustomFrom] = useState(query.from.slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date(new Date(query.to).getTime() - 1).toISOString().slice(0, 10));
  const quickPeriods = [
    { label: "Этот месяц", range: monthRange(0) },
    { label: "Прошлый месяц", range: monthRange(-1) },
    { label: "30 дней", range: dateRange(30) },
    { label: "90 дней", range: dateRange(90) },
  ];

  return (
    <>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {quickPeriods.map(({ label, range }) => (
          <AnalyticsSelectionPill key={label} selected={isSamePeriod(query, range)} onClick={() => onQueryChange({ ...query, ...range })}>{label}</AnalyticsSelectionPill>
        ))}
        <AnalyticsSelectionPill selected={false} onClick={(event) => setAnchor(event.currentTarget)}>Свой период</AnalyticsSelectionPill>
      </Stack>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { p: 1.5, width: 320 } }}>
        <Stack direction="row" spacing={1}>
          <TextField label="С" type="date" size="small" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="По" type="date" size="small" value={customTo} onChange={(event) => setCustomTo(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <AppPillButton
          size="small"
          variant="contained"
          sx={{ mt: 1.5 }}
          disabled={!customFrom || !customTo || customFrom > customTo}
          onClick={() => {
            const to = new Date(`${customTo}T00:00:00.000Z`);
            to.setUTCDate(to.getUTCDate() + 1);
            onQueryChange({ ...query, from: `${customFrom}T00:00:00.000Z`, to: to.toISOString() });
            setAnchor(null);
          }}
        >
          Применить период
        </AppPillButton>
      </Menu>
    </>
  );
}

export { sourceLabels };
