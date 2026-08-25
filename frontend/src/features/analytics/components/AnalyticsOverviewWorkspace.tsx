import { Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { AnalyticsLeaderboard, AnalyticsOverview, AnalyticsResources, AnalyticsRewardCategory } from "../types";
import AnalyticsRewardsChart from "./AnalyticsRewardsChart";
import AnalyticsSelectionPill from "./AnalyticsSelectionPill";
import { getResourceColor } from "./analyticsColors";
import { formatNumber, pluralizeRu } from "./analyticsFormat";
import { sourceLabels } from "./AnalyticsFilters";

interface AnalyticsOverviewWorkspaceProps {
  overview: AnalyticsOverview;
  resources: AnalyticsResources;
  leaderboard: AnalyticsLeaderboard | null;
  isLoadingPlayers: boolean;
  isShowingAllPlayers: boolean;
  rewardCategory: AnalyticsRewardCategory;
  onRewardCategoryChange: (rewardCategory: AnalyticsRewardCategory) => void;
  onShowAllPlayers: () => void;
  onCollapsePlayers: () => void;
}

export default function AnalyticsOverviewWorkspace({
  overview,
  resources,
  leaderboard,
  isLoadingPlayers,
  isShowingAllPlayers,
  rewardCategory,
  onRewardCategoryChange,
  onShowAllPlayers,
  onCollapsePlayers,
}: AnalyticsOverviewWorkspaceProps) {
  const rewardedResources = resources.resources.filter((entry) => entry.rewards.total !== 0);
  const hasAnyBonus = rewardedResources.some((entry) => entry.rewards.bonus !== 0);
  const visibleLeaderboardPlayers = isShowingAllPlayers ? leaderboard?.players : leaderboard?.players.slice(0, 5);
  const canToggleLeaderboardPlayers = Boolean(
    leaderboard && (leaderboard.nextCursor || leaderboard.players.length > 5),
  );

  return (
    <Stack spacing={2}>
      <AppResponsiveGrid columns={{ xs: 1, lg: 5 }} gap={2}>
        <Card sx={{ gridColumn: { lg: "span 3" } }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="h5">Выданные награды по дням</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>
              Как менялся объём выданных ресурсов в течение периода.
            </Typography>
            <AnalyticsRewardsChart overview={overview} resources={resources} />
          </CardContent>
        </Card>

        <Card sx={{ gridColumn: { lg: "span 2" } }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="h5">Лидеры периода</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>
              {leaderboard ? `По ресурсу «${leaderboard.resource.resource.name}».` : "По выбранному ресурсу."}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2.25 }}>
              {(
                [
                  ["total", "Все награды"],
                  ["regular", "Базовые"],
                  ["bonus", "Бонусные"],
                ] as Array<[AnalyticsRewardCategory, string]>
              ).map(([category, label]) => (
                <AnalyticsSelectionPill
                  key={category}
                  selected={rewardCategory === category}
                  onClick={() => onRewardCategoryChange(category)}
                >
                  {label}
                </AnalyticsSelectionPill>
              ))}
            </Stack>
            {isLoadingPlayers ? (
              <LeaderboardSkeleton />
            ) : visibleLeaderboardPlayers?.length ? (
              <Stack spacing={1}>
                {visibleLeaderboardPlayers.map((player, index) => (
                  <Box
                    key={player.playerRefId}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "36px minmax(0, 1fr) auto",
                      gap: 1.25,
                      alignItems: "center",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: (theme) => theme.customRadii.control,
                      px: 1.25,
                      py: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        bgcolor: index < 3 ? "rgba(234, 179, 8, .16)" : "rgba(15, 23, 42, .06)",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box minWidth={0}>
                      <Typography variant="subtitle2" noWrap>
                        {player.nicknameSnapshot}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(player.participations)}{" "}
                        {pluralizeRu(player.participations, ["участие", "участия", "участий"])}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="subtitle2">{formatNumber(player.rewards[rewardCategory])}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {leaderboard.resource.resource.label}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {canToggleLeaderboardPlayers ? (
                  <AppPillButton
                    variant="outlined"
                    loading={isLoadingPlayers}
                    onClick={isShowingAllPlayers ? onCollapsePlayers : onShowAllPlayers}
                    sx={{ mt: 0.5 }}
                  >
                    {isShowingAllPlayers ? "Свернуть список ↑" : "Показать всех игроков ↓"}
                  </AppPillButton>
                ) : null}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Нет игроков с наградами за период.
              </Typography>
            )}
          </CardContent>
        </Card>
      </AppResponsiveGrid>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h5">По типам проведений</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>
            Какие форматы дали основную активность за период.
          </Typography>
          <AppResponsiveGrid columns={{ xs: 1, sm: 2, lg: 5 }} gap={1.5}>
            {Object.entries(overview.sourceBreakdown).map(([sourceType, totals]) => {
              const playerReach =
                overview.uniqueResolvedPlayers > 0
                  ? Math.round((totals.uniquePlayers / overview.uniqueResolvedPlayers) * 100)
                  : 0;
              const participationCaption =
                totals.conductedSources === 0
                  ? "Не проводилось"
                  : `${formatNumber(totals.uniquePlayers)} ${pluralizeRu(totals.uniquePlayers, ["игрок", "игрока", "игроков"])} (${playerReach}%) ${pluralizeRu(totals.uniquePlayers, ["принял", "приняли", "приняли"])} участие`;
              return (
                <Box
                  key={sourceType}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: (theme) => theme.customRadii.control,
                    p: 1.5,
                  }}
                >
                  <Typography variant="subtitle2">{sourceLabels[sourceType as keyof typeof sourceLabels]}</Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {totals.conductedSources}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {participationCaption}
                  </Typography>
                </Box>
              );
            })}
          </AppResponsiveGrid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h5">Базовые и бонусные награды</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>
            Из чего сложились награды по каждому ресурсу. Ресурсы сравниваются только отдельно.
          </Typography>
          {!rewardedResources.length ? (
            <Typography color="text.secondary">За выбранный период награды не выдавались.</Typography>
          ) : !hasAnyBonus ? (
            <Typography color="text.secondary">
              За период начислялись только базовые награды — бонусных не было.
            </Typography>
          ) : (
            <AppResponsiveGrid columns={{ xs: 1, md: 2, lg: 3 }} gap={1.5}>
              {rewardedResources.map((entry, index) => {
                const color = getResourceColor(index);
                const total = entry.rewards.total;
                const basePercent = total > 0 ? (entry.rewards.regular / total) * 100 : 0;
                const bonusPercent = total > 0 ? (entry.rewards.bonus / total) * 100 : 0;
                return (
                  <Box
                    key={entry.resource.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: (theme) => theme.customRadii.control,
                      p: 1.75,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                      <Typography variant="subtitle2">{entry.resource.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(bonusPercent)}% бонусных
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        display: "flex",
                        height: 8,
                        mt: 1.25,
                        mb: 1.25,
                        borderRadius: 999,
                        overflow: "hidden",
                        bgcolor: "action.hover",
                      }}
                    >
                      <Box sx={{ width: `${basePercent}%`, bgcolor: color }} />
                      <Box sx={{ width: `${bonusPercent}%`, bgcolor: alpha(color, 0.4) }} />
                    </Box>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <RewardSplitLegend color={color} label="Базовые" value={entry.rewards.regular} />
                      <RewardSplitLegend color={alpha(color, 0.4)} label="Бонусные" value={entry.rewards.bonus} />
                    </Stack>
                  </Box>
                );
              })}
            </AppResponsiveGrid>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

function RewardSplitLegend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
    >
      <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} />
      {label} {formatNumber(value)}
    </Typography>
  );
}

function LeaderboardSkeleton() {
  return (
    <Stack spacing={1}>
      {[0, 1, 2, 3, 4].map((item) => (
        <Skeleton key={item} variant="rounded" height={64} />
      ))}
    </Stack>
  );
}
