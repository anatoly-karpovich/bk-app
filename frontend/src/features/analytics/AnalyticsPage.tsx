import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import GamePageHeader, { type GamePageHeaderAction } from "../../components/GamePageHeader";
import ProjectPlayerAutocomplete from "../../components/players/ProjectPlayerAutocomplete";
import AppInfoAlert from "../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../components/ui/AppSelectableListItem";
import type { Project } from "../projects/types";
import { useAuth } from "../auth/useAuth";
import { analyticsApiClient } from "./api/analytics.client";
import AnalyticsFilters, { AnalyticsQuickPeriodFilters } from "./components/AnalyticsFilters";
import AnalyticsOverviewWorkspace from "./components/AnalyticsOverviewWorkspace";
import AnalyticsPlayerWorkspace from "./components/AnalyticsPlayerWorkspace";
import AnalyticsSummaryChips from "./components/AnalyticsSummaryChips";
import { buildOverviewSummary, buildPlayerSummary } from "./components/analyticsSummary";
import { useAnalyticsOverview } from "./hooks/useAnalyticsOverview";
import { useAnalyticsPlayerDetails } from "./hooks/useAnalyticsPlayerDetails";
import { useProjectPlayers } from "../players/hooks/useProjectPlayers";

interface AnalyticsPageProps {
  selectedProject: Project | undefined;
}

export default function AnalyticsPage({ selectedProject }: AnalyticsPageProps) {
  const { query, overview, resources, leaderboard, rewardCategory, isLoading, isLoadingPlayers, error, actions } =
    useAnalyticsOverview(selectedProject?.id);
  const { players, isLoading: isLoadingProjectPlayers } = useProjectPlayers(selectedProject?.id);
  const { user } = useAuth();
  const [view, setView] = useState<"overview" | "player">("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>();
  const [isShowingAllPlayers, setIsShowingAllPlayers] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const playerDetails = useAnalyticsPlayerDetails(
    selectedProject?.id,
    selectedPlayerId,
    query,
    selectedResourceId,
    view === "player",
  );
  const freshness = overview?.integrity.freshness === "fresh" ? "Данные актуальны" : "Требуется проверка данных";
  const selectedPlayer = selectedPlayerId ? players.find((player) => player.id === selectedPlayerId) : undefined;
  const summaryItems =
    view === "overview"
      ? overview && resources
        ? buildOverviewSummary(overview, resources)
        : []
      : playerDetails.details
        ? buildPlayerSummary(playerDetails.details)
        : [];
  const isSummaryLoading = (view === "overview" ? isLoading : playerDetails.isLoading) && summaryItems.length === 0;

  async function handleRecalculate() {
    if (!selectedProject?.id || isRecalculating) return;
    setIsRecalculating(true);
    setRecalcError(null);
    try {
      await analyticsApiClient.refresh(selectedProject.id);
      await (view === "player" ? playerDetails.actions.reload() : actions.reload());
    } catch (caught) {
      setRecalcError(caught instanceof Error ? caught.message : "Не удалось пересчитать аналитику.");
    } finally {
      setIsRecalculating(false);
    }
  }

  const headerActions: GamePageHeaderAction[] = [
    {
      key: "refresh",
      label: "Обновить",
      icon: <RefreshRoundedIcon />,
      onClick: () => void (view === "player" ? playerDetails.actions.reload() : actions.reload()),
      loading: view === "player" ? playerDetails.isLoading : isLoading,
      variant: "outlined",
    },
  ];
  if (user?.role === "admin") {
    headerActions.push({
      key: "recalculate",
      label: "Пересчитать",
      icon: <CalculateRoundedIcon />,
      onClick: () => void handleRecalculate(),
      loading: isRecalculating,
      disabled: !selectedProject?.id,
      variant: "outlined",
    });
  }

  useEffect(() => {
    setSelectedPlayerId((current) =>
      current && players.some((player) => player.id === current) ? current : players[0]?.id,
    );
  }, [players]);

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
        actions={headerActions}
      />

      {recalcError ? (
        <Alert severity="error" onClose={() => setRecalcError(null)}>
          {recalcError}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "286px minmax(0, 1fr)" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Card sx={{ position: { lg: "sticky" }, top: { lg: 112 } }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h5">Аналитика</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1.5 }}>
              Выберите аналитический срез
            </Typography>
            <Stack spacing={1}>
              <AppSelectableListItem
                primaryText="Обзор проекта"
                secondaryText="Активность и результаты"
                icon={<AssessmentRoundedIcon />}
                selected={view === "overview"}
                onClick={() => setView("overview")}
              />
              <AppSelectableListItem
                primaryText="Игрок"
                secondaryText="Участия, награды и позиции"
                icon={<PeopleAltRoundedIcon />}
                selected={view === "player"}
                onClick={() => setView("player")}
              />
            </Stack>
            <AppInfoAlert sx={{ mt: 2 }}>
              Все показатели зависят от выбранного периода и типов проведений. Награды сравниваются только внутри одного
              ресурса.
            </AppInfoAlert>
          </CardContent>
        </Card>

        <Stack spacing={2} minWidth={0}>
          <Card>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={1.75}>
                <Box>
                  <Typography variant="h5">{view === "overview" ? "Обзор проекта" : "Игрок"}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {view === "overview"
                      ? "Ключевые показатели активности и наград за выбранный период."
                      : "Персональная история участия, наград и позиций."}
                  </Typography>
                </Box>
                <AnalyticsSummaryChips items={summaryItems} loading={isSummaryLoading} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    flexDirection: { xs: "column", xl: "row" },
                    alignItems: { xl: "center" },
                  }}
                >
                  <AnalyticsQuickPeriodFilters
                    query={query}
                    onQueryChange={(nextQuery) => {
                      setIsShowingAllPlayers(false);
                      actions.setQuery(nextQuery);
                    }}
                  />
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.25}
                    sx={{ width: { xs: "100%", xl: "auto" }, flexShrink: 0 }}
                  >
                    {view === "player" ? (
                      <Box sx={{ width: { xs: "100%", md: 264 } }}>
                        <ProjectPlayerAutocomplete
                          label="Игрок"
                          value={{
                            nickname: selectedPlayer?.content.nickname ?? "",
                            playerRefId: selectedPlayerId ?? null,
                          }}
                          players={players}
                          loading={isLoadingProjectPlayers}
                          allowCreation={false}
                          disabled={isLoadingProjectPlayers || !players.length}
                          onChange={(nextValue) => {
                            setSelectedPlayerId(nextValue.playerRefId ?? undefined);
                            setSelectedResourceId(undefined);
                          }}
                        />
                      </Box>
                    ) : null}
                    <AnalyticsFilters
                      query={query}
                      onQueryChange={(nextQuery) => {
                        setIsShowingAllPlayers(false);
                        actions.setQuery(nextQuery);
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {view === "overview" && error ? (
            <Alert
              severity="error"
              action={
                <button type="button" onClick={() => void actions.reload()}>
                  Повторить
                </button>
              }
            >
              {error}
            </Alert>
          ) : null}
          {view === "player" && playerDetails.error ? (
            <Alert
              severity="error"
              action={
                <button type="button" onClick={() => void playerDetails.actions.reload()}>
                  Повторить
                </button>
              }
            >
              {playerDetails.error}
            </Alert>
          ) : null}
          {view === "overview" && isLoading ? <AnalyticsSkeleton /> : null}
          {view === "overview" && !isLoading && overview && resources ? (
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
          {view === "player" && playerDetails.isLoading ? <AnalyticsSkeleton /> : null}
          {view === "player" && !playerDetails.isLoading && playerDetails.details ? (
            <AnalyticsPlayerWorkspace
              details={playerDetails.details}
              onResourceChange={setSelectedResourceId}
              onShowMoreHistory={() => void playerDetails.actions.loadMoreHistory()}
              isLoadingHistory={playerDetails.isLoadingHistory}
            />
          ) : null}
          {view === "player" && !isLoadingProjectPlayers && !players.length ? (
            <Card>
              <CardContent>
                <Typography>В проекте пока нет игроков.</Typography>
              </CardContent>
            </Card>
          ) : null}
          {view === "overview" && !isLoading && !overview && !error ? (
            <Card>
              <CardContent>
                <Typography>Выберите проект, чтобы посмотреть аналитику.</Typography>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}

function AnalyticsSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={390} />
      <Skeleton variant="rounded" height={220} />
      <Skeleton variant="rounded" height={160} />
    </Stack>
  );
}
