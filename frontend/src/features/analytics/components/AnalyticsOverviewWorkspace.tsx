import { Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { AnalyticsLeaderboard, AnalyticsOverview, AnalyticsResources, AnalyticsRewardCategory } from "../types";
import AnalyticsRewardsChart from "./AnalyticsRewardsChart";
import AnalyticsSelectionPill from "./AnalyticsSelectionPill";
import { sourceLabels } from "./AnalyticsFilters";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

interface MetricCardProps {
  label: string;
  value: number;
  caption: string;
  color?: string;
}

function MetricCard({ label, value, caption, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {color ? <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} /> : null}
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, letterSpacing: "-0.03em" }}>{formatNumber(value)}</Typography>
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
      </CardContent>
    </Card>
  );
}

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
  const metricResources = rewardedResources.slice(0, 3);
  const totalParticipations = Math.max(1, overview.participations);
  const visibleLeaderboardPlayers = isShowingAllPlayers ? leaderboard?.players : leaderboard?.players.slice(0, 7);
  const canToggleLeaderboardPlayers = Boolean(leaderboard && (leaderboard.nextCursor || leaderboard.players.length > 7));

  return (
    <Stack spacing={2}>
      <AppResponsiveGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap={2}>
        <MetricCard
          label="Проведений"
          value={overview.conductedSources}
          caption={`${overview.participations} участий · ${overview.uniqueResolvedPlayers} уникальных игроков`}
        />
        {metricResources.map((entry, index) => (
          <MetricCard
            key={entry.resource.id}
            label={`Выдано: ${entry.resource.name}`}
            value={entry.rewards.total}
            caption={`${formatNumber(entry.rewards.regular)} обычных · ${formatNumber(entry.rewards.bonus)} бонусных`}
            color={["#4f46e5", "#0891b2", "#8b5cf6"][index]}
          />
        ))}
      </AppResponsiveGrid>

      <AppResponsiveGrid columns={{ xs: 1, lg: 5 }} gap={2}>
        <Card sx={{ gridColumn: { lg: "span 3" } }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography variant="h5">Выданные награды по дням</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>Как менялся объём выданных ресурсов в течение периода.</Typography>
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
              {([
                ["total", "Все награды"],
                ["regular", "Базовые"],
                ["bonus", "Бонусные"],
              ] as Array<[AnalyticsRewardCategory, string]>).map(([category, label]) => (
                <AnalyticsSelectionPill key={category} selected={rewardCategory === category} onClick={() => onRewardCategoryChange(category)}>{label}</AnalyticsSelectionPill>
              ))}
            </Stack>
            {isLoadingPlayers ? <LeaderboardSkeleton /> : visibleLeaderboardPlayers?.length ? (
              <Stack spacing={1}>
                {visibleLeaderboardPlayers.map((player, index) => (
                  <Box key={player.playerRefId} sx={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1fr) auto", gap: 1.25, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.control, px: 1.25, py: 1 }}>
                    <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: index < 3 ? "rgba(234, 179, 8, .16)" : "rgba(15, 23, 42, .06)", fontSize: 12, fontWeight: 800 }}>{index + 1}</Box>
                    <Box minWidth={0}>
                      <Typography variant="subtitle2" noWrap>{player.nicknameSnapshot}</Typography>
                      <Typography variant="caption" color="text.secondary">{player.participations} участий</Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="subtitle2">{formatNumber(player.rewards[rewardCategory])}</Typography>
                      <Typography variant="caption" color="text.secondary">{leaderboard.resource.resource.label}</Typography>
                    </Box>
                  </Box>
                ))}
                {canToggleLeaderboardPlayers ? (
                  <AppPillButton variant="outlined" loading={isLoadingPlayers} onClick={isShowingAllPlayers ? onCollapsePlayers : onShowAllPlayers} sx={{ mt: 0.5 }}>
                    {isShowingAllPlayers ? "Свернуть список ↑" : "Показать всех игроков ↓"}
                  </AppPillButton>
                ) : null}
              </Stack>
            ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Нет игроков с наградами за период.</Typography>}
          </CardContent>
        </Card>
      </AppResponsiveGrid>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h5">По типам проведений</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>Какие форматы дали основную активность за период.</Typography>
          <AppResponsiveGrid columns={{ xs: 1, sm: 2, lg: 5 }} gap={1.5}>
            {Object.entries(overview.sourceBreakdown).map(([sourceType, totals]) => (
              <Box key={sourceType} sx={{ border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.control, p: 1.5 }}>
                <Typography variant="subtitle2">{sourceLabels[sourceType as keyof typeof sourceLabels]}</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{totals.conductedSources}</Typography>
                <Typography variant="caption" color="text.secondary">{totals.participations} участий · {Math.round((totals.participations / totalParticipations) * 100)}%</Typography>
              </Box>
            ))}
          </AppResponsiveGrid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h5">Награды по ресурсам</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>Ресурсы не конвертируются между собой и сравниваются только отдельно.</Typography>
          {rewardedResources.length ? (
            <AppResponsiveGrid columns={{ xs: 1, md: 2, lg: 3 }} gap={1.5}>
              {rewardedResources.map((entry) => (
                <Box key={entry.resource.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.control, p: 1.75 }}>
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="subtitle2">{entry.resource.name}</Typography>
                    <Typography variant="caption" color="primary.main" fontWeight={700}>{entry.resource.type === "currency" ? "Валюта" : "Предмет"}</Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ mt: 1.25 }}>{formatNumber(entry.rewards.total)}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatNumber(entry.rewards.regular)} обычных · {formatNumber(entry.rewards.bonus)} бонусных</Typography>
                </Box>
              ))}
            </AppResponsiveGrid>
          ) : <Typography color="text.secondary">За выбранный период награды не выдавались.</Typography>}
        </CardContent>
      </Card>
    </Stack>
  );
}

function LeaderboardSkeleton() {
  return (
    <Stack spacing={1}>
      {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} variant="rounded" height={64} />)}
    </Stack>
  );
}
