import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import { Box, Button, Menu, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppMultiSelectFilter from "../../../components/ui/AppMultiSelectFilter";
import type { AnalyticsQuery, AnalyticsSourceType } from "../types";
import AnalyticsSelectionPill from "./AnalyticsSelectionPill";
import { customRangeToQuery, formatPeriod, isSamePeriod, periodPresets } from "./analyticsPeriods";

const sourceLabels: Record<AnalyticsSourceType, string> = {
  quiz: "Викторины",
  journey: "Карта Мародёров",
  lotto_bingo: "Лото Бинго",
  lotto: "Лото",
  battleships: "Морской бой",
  memes: "Карты, Мемы, Два ствола!",
  forum_quiz: "Форумная викторина",
  tournament: "Турнир",
};
const allSourceTypes: AnalyticsSourceType[] = ["quiz", "journey", "lotto_bingo", "lotto", "battleships", "memes", "forum_quiz", "tournament"];

interface AnalyticsFiltersProps {
  query: AnalyticsQuery;
  onQueryChange: (query: AnalyticsQuery) => void;
}

/** Right-hand filter controls: exact custom period and the conducted-source picker. */
export default function AnalyticsFilters({ query, onQueryChange }: AnalyticsFiltersProps) {
  const [periodAnchor, setPeriodAnchor] = useState<HTMLElement | null>(null);
  const [customFrom, setCustomFrom] = useState(query.from.slice(0, 10));
  const [customTo, setCustomTo] = useState(query.to);

  // Keep the custom-range inputs aligned with the active period (e.g. after a quick preset).
  useEffect(() => {
    setCustomFrom(query.from.slice(0, 10));
    setCustomTo(query.to);
  }, [query.from, query.to]);

  function applyCustomPeriod() {
    onQueryChange({ ...query, ...customRangeToQuery(customFrom, customTo) });
    setPeriodAnchor(null);
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
      <AppMultiSelectFilter
        label="Проведения"
        allLabel="Все типы"
        options={allSourceTypes.map((value) => ({ value, label: sourceLabels[value] }))}
        selectedValues={query.sourceTypes}
        onSelectedValuesChange={(sourceTypes) => onQueryChange({ ...query, sourceTypes })}
      />

      <Menu anchorEl={periodAnchor} open={Boolean(periodAnchor)} onClose={() => setPeriodAnchor(null)} PaperProps={{ sx: { p: 1.5, width: 320 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 0.5, mb: 1.25 }}>
          Свой период
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField label="С" type="date" size="small" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="По" type="date" size="small" value={customTo} onChange={(event) => setCustomTo(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <AppPillButton
          size="small"
          variant="contained"
          sx={{ mt: 1.5 }}
          disabled={!customFrom || !customTo || customFrom > customTo}
          onClick={applyCustomPeriod}
        >
          Применить период
        </AppPillButton>
      </Menu>
    </Stack>
  );
}

/** Left-hand quick period presets. Custom ranges live in {@link AnalyticsFilters}. */
export function AnalyticsQuickPeriodFilters({ query, onQueryChange }: AnalyticsFiltersProps) {
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {periodPresets().map(({ label, range }) => (
        <AnalyticsSelectionPill key={label} selected={isSamePeriod(query, range)} onClick={() => onQueryChange({ ...query, ...range })}>
          {label}
        </AnalyticsSelectionPill>
      ))}
    </Stack>
  );
}

export { sourceLabels };
