import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatJourneyCurrencyValues } from "../journey-page.helpers";
import type { JourneyAchievement, JourneyAchievementsMap, JourneyConfig } from "../types";

interface JourneyRulesDialogProps {
  open: boolean;
  onClose: () => void;
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
}

function JourneyRulesSummary({
  journeyConfig,
  journeyAchievements,
}: {
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
}) {
  const achievementList = Object.values(journeyAchievements) as JourneyAchievement[];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <AppChip
          label={`${journeyTexts.rulesChips.startPrefix} ${formatJourneyCurrencyValues(journeyConfig.initialRewards, journeyConfig.currencies, { includeZero: true })}`}
          color="primary"
        />
        <AppChip label={`${journeyTexts.rulesChips.mapPrefix} ${journeyConfig.mapSize} ${journeyTexts.rulesChips.mapSuffix}`} color="secondary" />
        <AppChip label={`${journeyTexts.rulesChips.movePrefix} ${journeyConfig.minDice}-${journeyConfig.maxDice}`} />
        <AppChip
          label={`${journeyTexts.rulesChips.jackpotPrefix} ${formatJourneyCurrencyValues(journeyConfig.jackpotRewards, journeyConfig.currencies, { showPlus: true, includeZero: false })}`}
          color="warning"
        />
        {journeyConfig.maxPrizes ? (
          <AppChip
            label={`${journeyTexts.rulesChips.prizeLimitPrefix} ${formatJourneyCurrencyValues(journeyConfig.maxPrizes, journeyConfig.currencies, { includeZero: true })}`}
          />
        ) : (
          <AppChip label={journeyTexts.rulesChips.noPrizeLimit} />
        )}
      </Stack>

      <Divider />

      <Stack spacing={1.25}>
        {achievementList
          .filter((achievement) => achievement.name !== journeyAchievements.JACKPOT.name)
          .map((achievement) => (
            <Box key={achievement.name}>
              <Typography fontWeight={700}>
                {achievement.title} - {formatJourneyCurrencyValues(achievement.rewards, journeyConfig.currencies, { showPlus: true, includeZero: false })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {achievement.description}
              </Typography>
            </Box>
          ))}
      </Stack>
    </Stack>
  );
}

export default function JourneyRulesDialog({
  open,
  onClose,
  journeyConfig,
  journeyAchievements,
}: JourneyRulesDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{journeyTexts.rulesDialogTitle}</DialogTitle>
      <DialogContent dividers>
        <JourneyRulesSummary journeyConfig={journeyConfig} journeyAchievements={journeyAchievements} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {journeyTexts.actions.close}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
