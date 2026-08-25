import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import GamePageHeader from "../../components/GamePageHeader";
import AppInfoAlert from "../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../components/ui/AppSelectableListItem";
import type { Project } from "../projects/types";
import AnalyticsFilters, { AnalyticsQuickPeriodFilters } from "./components/AnalyticsFilters";
import AnalyticsOverviewWorkspace from "./components/AnalyticsOverviewWorkspace";
import { useAnalyticsOverview } from "./hooks/useAnalyticsOverview";

interface AnalyticsPageProps {
  selectedProject: Project | undefined;
}

export default function AnalyticsPage({ selectedProject }: AnalyticsPageProps) {
  const { query, overview, resources, leaderboard, rewardCategory, isLoading, isLoadingPlayers, error, actions } = useAnalyticsOverview(selectedProject?.id);
  const [isShowingAllPlayers, setIsShowingAllPlayers] = useState(false);
  const freshness = overview?.integrity.freshness === "fresh" ? "Данные актуальны" : "Требуется проверка данных";

  return (
    <Stack spacing={2.75}>
      <GamePageHeader
        breadcrumbPath="/analytics"
        title="Аналитика"
        description="Активность участников, результаты проведений и распределение наград по проекту."
        chips={[
          { label: `Проект: ${selectedProject?.name ?? "не выбран"}` },
          { label: freshness, color: overview?.integrity.freshness === "fresh" ? "success" : "warning" },
        ]}
        actions={[{ key: "refresh", label: "Обновить", icon: <RefreshRoundedIcon />, onClick: () => void actions.reload(), loading: isLoading, variant: "outlined" }]}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "286px minmax(0, 1fr)" }, gap: 2.5, alignItems: "start" }}>
        <Card sx={{ position: { lg: "sticky" }, top: { lg: 112 } }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h5">Аналитика</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1.5 }}>Выберите аналитический срез</Typography>
            <Stack spacing={1}>
              <AppSelectableListItem primaryText="Обзор проекта" secondaryText="Активность и результаты" icon={<AssessmentRoundedIcon />} selected onClick={() => undefined} />
              <AppSelectableListItem primaryText="Игрок" secondaryText="Участия, награды и позиции" icon={<PeopleAltRoundedIcon />} selected={false} onClick={() => undefined} />
            </Stack>
            <AppInfoAlert sx={{ mt: 2 }}>Все показатели зависят от выбранного периода и типов проведений. Награды сравниваются только внутри одного ресурса.</AppInfoAlert>
          </CardContent>
        </Card>

        <Stack spacing={2} minWidth={0}>
          <Card>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: { md: "center" }, flexDirection: { xs: "column", md: "row" } }}>
                <Box>
                  <Typography variant="h5">Обзор проекта</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Ключевые показатели активности и наград за выбранный период.</Typography>
                </Box>
                <AnalyticsFilters
                  query={query}
                  onQueryChange={(nextQuery) => {
                    setIsShowingAllPlayers(false);
                    actions.setQuery(nextQuery);
                  }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <AnalyticsQuickPeriodFilters
                  query={query}
                  onQueryChange={(nextQuery) => {
                    setIsShowingAllPlayers(false);
                    actions.setQuery(nextQuery);
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {error ? <Alert severity="error" action={<button type="button" onClick={() => void actions.reload()}>Повторить</button>}>{error}</Alert> : null}
          {isLoading ? <AnalyticsSkeleton /> : null}
          {!isLoading && overview && resources ? (
            <AnalyticsOverviewWorkspace
              overview={overview}
              resources={resources}
              leaderboard={leaderboard}
              isLoadingPlayers={isLoadingPlayers}
              isShowingAllPlayers={isShowingAllPlayers}
              rewardCategory={rewardCategory}
              onRewardCategoryChange={(category) => {
                setIsShowingAllPlayers(false);
                void actions.selectRewardCategory(category);
              }}
              onShowAllPlayers={async () => {
                if (await actions.showAllPlayers()) setIsShowingAllPlayers(true);
              }}
              onCollapsePlayers={() => {
                setIsShowingAllPlayers(false);
              }}
            />
          ) : null}
          {!isLoading && !overview && !error ? <Card><CardContent><Typography>Выберите проект, чтобы посмотреть аналитику.</Typography></CardContent></Card> : null}
        </Stack>
      </Box>
    </Stack>
  );
}

function AnalyticsSkeleton() {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={130} />)}
      </Box>
      <Skeleton variant="rounded" height={390} />
      <Skeleton variant="rounded" height={220} />
    </Stack>
  );
}
