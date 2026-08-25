import { Box, Skeleton, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AppChip from "../../../components/ui/AppChip";

export interface AnalyticsSummaryChip {
  key: string;
  label: string;
  /** Present for reward-resource totals; absent for neutral operational metrics. */
  color?: string;
}

interface AnalyticsSummaryChipsProps {
  items: AnalyticsSummaryChip[];
  loading?: boolean;
}

/**
 * Compact glance-level summary of the current analytics selection.
 * Operational metrics stay neutral; reward resources carry their series colour to
 * separate "how much activity" from "how much was granted".
 */
export default function AnalyticsSummaryChips({ items, loading = false }: AnalyticsSummaryChipsProps) {
  if (loading) {
    return (
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {[112, 96, 132].map((width) => (
          <Skeleton key={width} variant="rounded" width={width} height={32} sx={{ borderRadius: 999 }} />
        ))}
      </Stack>
    );
  }

  if (!items.length) return null;

  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <AppChip
          key={item.key}
          label={
            item.color ? (
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: item.color }} />
                {item.label}
              </Box>
            ) : (
              item.label
            )
          }
          sx={{
            fontWeight: 600,
            ...(item.color
              ? { bgcolor: alpha(item.color, 0.12), color: "text.primary" }
              : {}),
          }}
        />
      ))}
    </Stack>
  );
}
