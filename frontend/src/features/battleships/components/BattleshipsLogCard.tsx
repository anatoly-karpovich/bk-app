import HistoryEduRoundedIcon from "@mui/icons-material/HistoryEduRounded";
import { Alert, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import { formatBattleshipsTimestamp } from "../mappers/battleships.mapper";
import type { BattleshipsShot } from "../types";

interface BattleshipsLogCardProps {
  shots: BattleshipsShot[];
  currency: string;
}

export default function BattleshipsLogCard({ shots, currency }: BattleshipsLogCardProps) {
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
                    Изменение приза: {shot.prizeDelta >= 0 ? "+" : ""}
                    {shot.prizeDelta} {currency}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Накоплено: {shot.totalPrize} {currency}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Alert severity="info" icon={<HistoryEduRoundedIcon fontSize="inherit" />}>
            {battleshipsTexts.alerts.logEmpty}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
