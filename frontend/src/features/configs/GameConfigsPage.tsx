import { useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
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
import { useNavigate } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppTextInput from "../../components/ui/AppTextInput";
import { gameConfigsTexts } from "../../texts/gameConfigsTexts";
import { getGameConfigRequest } from "../projects/api/projects.client";
import type { AnyGameConfig, GameType, Project, UpdateGameConfigInput } from "../projects/types";
import GameConfigCard from "./components/GameConfigCard";
import GameConfigEditorDialog from "./components/GameConfigEditorDialog";
import GameTypeFilterCard from "./components/GameTypeFilterCard";
import { useGameConfigs } from "./hooks/useGameConfigs";

const gameTypes: GameType[] = ["journey", "lotto", "battleships"];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : gameConfigsTexts.alerts.loadFailed;
}

interface GameConfigsPageProps {
  selectedProject: Project | null;
}

export default function GameConfigsPage({ selectedProject }: GameConfigsPageProps) {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState<GameType>("journey");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConfig, setEditingConfig] = useState<AnyGameConfig | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const { gameConfigs, error, isLoading, isSaving, actions } = useGameConfigs(selectedProject?.id);
  const configCounts = useMemo(
    () =>
      gameTypes.reduce<Record<GameType, number>>(
        (counts, type) => {
          counts[type] = gameConfigs.filter((config) => config.gameType === type).length;
          return counts;
        },
        { journey: 0, lotto: 0, battleships: 0 },
      ),
    [gameConfigs],
  );
  const selectedGameConfigs = useMemo(
    () => gameConfigs.filter((config) => config.gameType === gameType),
    [gameConfigs, gameType],
  );
  const visibleConfigs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return selectedGameConfigs;
    }

    return selectedGameConfigs.filter((config) =>
      `${config.name} ${config.description}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, selectedGameConfigs]);

  async function openEditor(config: AnyGameConfig) {
    if (!selectedProject) {
      return;
    }

    if (config.gameType === "journey") {
      navigate(`/configs/journey/${encodeURIComponent(config.id)}`);
      return;
    }

    setEditingConfig(null);
    setEditorError(null);
    setIsEditorOpen(true);
    setIsLoadingEditor(true);

    try {
      setEditingConfig(await getGameConfigRequest(selectedProject.id, config.id));
    } catch (nextError) {
      setEditorError(getErrorMessage(nextError));
    } finally {
      setIsLoadingEditor(false);
    }
  }

  function closeEditor() {
    if (!isSaving) {
      setIsEditorOpen(false);
      setEditingConfig(null);
      setEditorError(null);
    }
  }

  async function saveConfig(input: UpdateGameConfigInput) {
    if (!editingConfig) {
      return;
    }

    const updated = await actions.updateGameConfig(editingConfig.id, input);
    if (updated) {
      closeEditor();
      return;
    }

    setEditorError(gameConfigsTexts.alerts.saveFailed);
  }

  if (!selectedProject) {
    return <Alert severity="warning">{gameConfigsTexts.alerts.projectRequired}</Alert>;
  }

  return (
    <>
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
              {
                key: "refresh",
                label: gameConfigsTexts.page.refresh,
                icon: <RefreshRoundedIcon />,
                onClick: () => void actions.loadGameConfigs(),
                loading: isLoading,
                variant: "text",
                color: "inherit",
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
              setGameType(nextGameType);
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
                    <GameConfigCard config={config} onOpen={(nextConfig) => void openEditor(nextConfig)} />
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

      <GameConfigEditorDialog
        project={selectedProject}
        gameConfig={editingConfig}
        open={isEditorOpen}
        isLoading={isLoadingEditor}
        isSaving={isSaving}
        error={editorError}
        onClose={closeEditor}
        onSave={saveConfig}
      />
    </>
  );
}
