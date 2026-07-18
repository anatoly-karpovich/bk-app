import { Alert, Box, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { journeyTexts } from "../../../texts/journeyTexts";
import { getJourneyPlayerBalanceLabel } from "../journey-page.helpers";
import type { JourneyCurrencyDefinition, JourneyPlayerReadModel } from "../types";

interface JourneyResultsCardProps {
  gameIsOver: boolean;
  finishedPlayers: JourneyPlayerReadModel[];
  results: JourneyPlayerReadModel[];
  currencies: JourneyCurrencyDefinition[];
}

export default function JourneyResultsCard({
  gameIsOver,
  finishedPlayers,
  results,
  currencies,
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
            {results.map((player) => (
              <Box
                key={player.nickname}
                sx={{
                  p: 1.5,
                  borderRadius: (theme) => theme.customRadii.md,
                  backgroundColor: "rgba(255,255,255,0.64)",
                }}
              >
                <Typography fontWeight={700}>{player.nickname}</Typography>
                <Typography variant="body2" color="text.secondary">
                  [{getJourneyPlayerBalanceLabel(player, currencies)}]
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
