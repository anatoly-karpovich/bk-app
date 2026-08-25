import { Alert, Box, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { journeyTexts } from "../../../texts/journeyTexts";
import { formatJourneyResourceAmounts, getJourneyPlayerFinalRewardsLabel } from "../journey-page.helpers";
import type { JourneyPlayerReadModel, JourneyResourceDefinition } from "../types";

interface JourneyResultsCardProps {
  gameIsOver: boolean;
  finishedPlayers: JourneyPlayerReadModel[];
  results: JourneyPlayerReadModel[];
  resources: JourneyResourceDefinition[];
}

export default function JourneyResultsCard({
  gameIsOver,
  finishedPlayers,
  results,
  resources,
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
                {player.finalRewards ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {journeyTexts.table.rewards}: [{getJourneyPlayerFinalRewardsLabel(player, resources)}]
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {journeyTexts.table.regular}: {formatJourneyResourceAmounts(player.finalRewards.regular, resources, { includeZero: true })}
                      {" · "}
                      {journeyTexts.table.bonus}: {formatJourneyResourceAmounts(player.finalRewards.bonus, resources, { includeZero: true })}
                    </Typography>
                  </>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
