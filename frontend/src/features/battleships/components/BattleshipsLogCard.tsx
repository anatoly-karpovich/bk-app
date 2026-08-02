import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../rewards/types";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import { formatBattleshipsTimestamp } from "../mappers/battleships.mapper";
import type { BattleshipsShot } from "../types";

interface BattleshipsLogCardProps {
  shots: BattleshipsShot[];
  resources: ResourceDefinition[];
}

export default function BattleshipsLogCard({ shots, resources }: BattleshipsLogCardProps) {
  return (
    <Card>
      <CardHeader title={battleshipsTexts.cards.logTitle} subheader={battleshipsTexts.cards.logSubtitle} />
      <CardContent>
        {shots.length ? (
          <Stack spacing={1.5}>
            {[...shots].reverse().map((shot) => (
              <Stack
                key={`${shot.createdAt}-${shot.coordinateLabel}`}
                spacing={1}
                sx={{
                  p: 1.5,
                  borderRadius: (theme) => theme.customRadii.surface,
                  backgroundColor: "rgba(15, 23, 42, 0.03)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={800}>{shot.coordinateLabel}</Typography>
                    <AppChip
                      size="small"
                      color={shot.result === "kill" ? "error" : shot.result === "hit" ? "warning" : "default"}
                      label={shot.resultLabel}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatBattleshipsTimestamp(shot.createdAt)}
                  </Typography>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Изменение приза: {formatResourceAmounts(shot.prizeDelta, resources, { showPlus: true }) || "0"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Накоплено: {formatResourceAmounts(shot.totalPrize, resources) || "0"}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : (
          <AppInfoAlert>
            {battleshipsTexts.alerts.logEmpty}
          </AppInfoAlert>
        )}
      </CardContent>
    </Card>
  );
}
