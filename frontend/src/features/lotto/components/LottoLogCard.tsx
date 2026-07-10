import { Alert, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { lottoTexts } from "../../../texts/lottoTexts";
import { formatLottoTimestamp } from "../mappers/lotto.mapper";
import type { LottoEvent } from "../types";

interface LottoLogCardProps {
  events: LottoEvent[] | undefined;
}

export default function LottoLogCard({ events }: LottoLogCardProps) {
  const sortedEvents = events ? [...events].reverse() : [];

  return (
    <Card>
      <CardHeader title={lottoTexts.cards.logTitle} subheader={lottoTexts.cards.logSubtitle} />
      <CardContent>
        {!sortedEvents.length ? (
          <Alert severity="info">{lottoTexts.alerts.logEmpty}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {sortedEvents.map((event, index) => (
              <Stack
                key={`${event.createdAt}-${index}`}
                spacing={0.5}
                sx={{
                  p: 1.5,
                  borderRadius: (theme) => theme.customRadii.md,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  backgroundColor: "rgba(15, 23, 42, 0.02)",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {formatLottoTimestamp(event.createdAt)}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {event.message}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
