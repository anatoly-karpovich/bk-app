import { useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppTextInput from "../../components/ui/AppTextInput";
import { useAuth } from "../auth/useAuth";
import { gameConfigsTexts } from "../../texts/gameConfigsTexts";
import type { AnyGameConfig, GameType, Project } from "../projects/types";
import GameConfigCard from "./components/GameConfigCard";
import GameTypeFilterCard from "./components/GameTypeFilterCard";
import { useGameConfigs } from "./hooks/useGameConfigs";

const gameTypes: GameType[] = ["journey", "lotto", "lotto_bingo", "battleships"];

interface GameConfigsPageProps {
  selectedProject: Project | null;
}

export default function GameConfigsPage({ selectedProject }: GameConfigsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const gameType = gameTypes.find((candidate) => candidate === searchParams.get("gameType")) ?? "journey";
  const { gameConfigs, error, isLoading, actions } = useGameConfigs(selectedProject?.id);
  const { user } = useAuth();
  const configCounts = useMemo(
    () =>
      gameTypes.reduce<Record<GameType, number>>(
        (counts, type) => {
          counts[type] = gameConfigs.filter((config) => config.gameType === type).length;
          return counts;
        },
        { journey: 0, lotto: 0, lotto_bingo: 0, battleships: 0 },
      ),
    [gameConfigs],
  );
  const selectedGameConfigs = useMemo(
    () => gameConfigs.filter((config) => config.gameType === gameType),
    [gameConfigs, gameType],
  );
  const visibleConfigs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return selectedGameConfigs;

    return selectedGameConfigs.filter((config) =>
      `${config.name} ${config.description}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, selectedGameConfigs]);

  function openEditor(config: AnyGameConfig) {
    navigate(`/configs/${config.gameType}/${encodeURIComponent(config.id)}`);
  }

  function openClone(config: AnyGameConfig) {
    navigate(`/configs/${config.gameType}/new?sourceConfigId=${encodeURIComponent(config.id)}`);
  }

  if (!selectedProject) {
    return <Alert severity="warning">{gameConfigsTexts.alerts.projectRequired}</Alert>;
  }

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/configs"
          title={gameConfigsTexts.page.title}
          description={gameConfigsTexts.page.description}
          chips={[
            { label: gameConfigsTexts.page.projectChip(selectedProject.name) },
            { label: gameConfigsTexts.page.gameTypesChip(gameTypes.length), color: "secondary" },
            { label: gameConfigsTexts.page.configsChip(gameConfigs.length), color: "secondary" },
          ]}
          actions={[
            ...(gameType === "lotto_bingo" ? [{
              key: "create-lotto-bingo",
              label: "Создать конфигурацию",
              icon: <QuizRoundedIcon />,
              onClick: () => navigate("/configs/lotto_bingo/new"),
              variant: "contained" as const,
            }] : []),
            {
              key: "refresh",
              label: gameConfigsTexts.page.refresh,
              icon: <RefreshRoundedIcon />,
              onClick: () => void actions.loadGameConfigs(),
              loading: isLoading,
              variant: "text",
              color: "inherit",
            },
            {
              key: "quiz-configs",
              label: "Викторины",
              icon: <QuizRoundedIcon />,
              onClick: () => navigate("/configs/quizzes"),
              variant: "outlined",
            },
          ]}
        />
      </Grid>

      {error ? (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      ) : null}

      <Grid item xs={12} lg={4} xl={3}>
        <GameTypeFilterCard
          gameTypes={gameTypes}
          selectedGameType={gameType}
          configCounts={configCounts}
          onSelect={(nextGameType) => {
            setSearchParams({ gameType: nextGameType });
            setSearchQuery("");
          }}
        />
      </Grid>

      <Grid item xs={12} lg={8} xl={9}>
        <Stack spacing={2.25}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h5">{gameConfigsTexts.section.title(gameType)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {gameConfigsTexts.section.description(gameType)}
                  </Typography>
                </Stack>
                <AppTextInput
                  size="small"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={gameConfigsTexts.section.searchPlaceholder}
                  inputProps={{ "aria-label": gameConfigsTexts.section.searchPlaceholder }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" color="disabled" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}
                />
              </Stack>
            </CardContent>
          </Card>

          {isLoading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : visibleConfigs.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "repeat(2, minmax(0, 1fr))" },
                gap: 2.25,
              }}
            >
              {visibleConfigs.map((config) => (
                <Box key={config.id}>
                  <GameConfigCard
                    config={config}
                    canEdit={user?.role === "admin" || (!config.isSystem && config.createdByUserId === user?.id)}
                    onOpen={openEditor}
                    onClone={openClone}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Card>
              <CardContent sx={{ py: 4, textAlign: "center" }}>
                <Typography variant="h6">
                  {selectedGameConfigs.length
                    ? gameConfigsTexts.empty.searchTitle
                    : gameConfigsTexts.empty.noConfigs(gameType)}
                </Typography>
                {selectedGameConfigs.length ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    {gameConfigsTexts.empty.searchDescription}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
