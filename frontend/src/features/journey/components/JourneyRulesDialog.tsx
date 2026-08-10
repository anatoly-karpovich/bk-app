import { Box, Divider, Stack, Typography } from "@mui/material";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import GameRulesDialog from "../../../components/GameRulesDialog";
import { formatJourneyRewardPool, formatJourneyResourceAmounts } from "../journey-page.helpers";
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
          label={`${journeyTexts.rulesChips.startPrefix} ${formatJourneyRewardPool(journeyConfig.initialRewardPool, journeyConfig.resources)}`}
          color="primary"
        />
        <AppChip label={`${journeyTexts.rulesChips.mapPrefix} ${journeyConfig.mapSize} ${journeyTexts.rulesChips.mapSuffix}`} color="secondary" />
        <AppChip label={`${journeyTexts.rulesChips.movePrefix} ${journeyConfig.minDice}-${journeyConfig.maxDice}`} />
        <AppChip
          label={`${journeyTexts.rulesChips.jackpotPrefix} ${formatJourneyRewardPool(journeyConfig.jackpotRewardPool, journeyConfig.resources)}`}
          color="warning"
        />
        {journeyConfig.resourceLimits.length ? (
          <AppChip
            label={`${journeyTexts.rulesChips.prizeLimitPrefix} ${formatJourneyResourceAmounts(
              journeyConfig.resourceLimits.flatMap((limit) => limit.max === undefined ? [] : [{ resourceId: limit.resourceId, amount: limit.max }]),
              journeyConfig.resources,
              { includeZero: true },
            )}`}
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
                {achievement.title} - {formatJourneyRewardPool(achievement.rewardPool, journeyConfig.resources)}
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
    <GameRulesDialog open={open} title={journeyTexts.rulesDialogTitle} onClose={onClose}>
      <JourneyRulesSummary journeyConfig={journeyConfig} journeyAchievements={journeyAchievements} />
    </GameRulesDialog>
  );
}
