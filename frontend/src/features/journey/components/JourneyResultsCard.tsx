import { Alert, Box, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import type { JourneyPlayer, JourneyReceiptsDistribution } from "../types";

interface JourneyResultPlayer extends JourneyPlayer {
  fullPrize: number;
}

interface JourneyResultsCardProps {
  gameIsOver: boolean;
  finishedPlayers: JourneyPlayer[];
  results: JourneyResultPlayer[];
  receipts: JourneyReceiptsDistribution | null;
  currency: string;
}

export default function JourneyResultsCard({
  gameIsOver,
  finishedPlayers,
  results,
  receipts,
  currency,
}: JourneyResultsCardProps) {
  if (!gameIsOver) {
    return null;
  }

  return (
    <Card>
      <CardHeader title={journeyTexts.cards.resultsTitle} subheader={journeyTexts.cards.resultsSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          <Alert icon={<EmojiEventsRoundedIcon fontSize="inherit" />} severity="success">
            {journeyTexts.alerts.resultsCompletePrefix} {finishedPlayers.length} {journeyTexts.alerts.resultsCompleteSuffix}
          </Alert>
          <Stack spacing={1}>
            {results.map((player, index) => (
              <Box
                key={player.nickname}
                sx={{
                  p: 1.5,
                  borderRadius: (theme) => theme.customRadii.md,
                  backgroundColor: index === 0 ? "rgba(245, 158, 11, 0.14)" : "rgba(255,255,255,0.64)",
                }}
              >
                <Typography fontWeight={700}>
                  {index + 1}. {player.nickname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {player.fullPrize} {currency}
                </Typography>
              </Box>
            ))}
          </Stack>
          {receipts ? (
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                {journeyTexts.results.receiptsTitle}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(receipts).map(([amount, count]) => (
                  <AppChip key={amount} label={`${amount}: ${count}`} />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
