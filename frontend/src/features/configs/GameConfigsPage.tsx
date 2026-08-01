import { useMemo, useState } from "react";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Card, CardActions, CardContent, CircularProgress, Divider, Grid, Stack, Tab, Tabs, Typography } from "@mui/material";
import PageBreadcrumbs from "../../components/PageBreadcrumbs";
import AppPillButton from "../../components/ui/AppPillButton";
import { getGameConfigRequest } from "../projects/api/projects.client";
import type { AnyGameConfig, GameType, Project, UpdateGameConfigInput } from "../projects/types";
import GameConfigEditorDialog from "./components/GameConfigEditorDialog";
import { useGameConfigs } from "./hooks/useGameConfigs";

const gameTypeLabels: Record<GameType, string> = {
  journey: "Карта Мародёров",
  lotto: "Лото",
  battleships: "Морской бой",
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось загрузить конфиг.";
}

function getSummaryLines(config: AnyGameConfig): string[] {
  switch (config.gameType) {
    case "journey":
      return [
        `Поле: ${config.summary.mapSize} клеток`,
        `Ход: ${config.summary.diceRange}`,
        `Джекпот: ${config.summary.jackpot}`,
        `Бонусов: ${config.summary.bonusKinds}, ловушек: ${config.summary.trapKinds}`,
      ];
    case "battleships":
      return [
        `Поле: ${config.summary.boardSize}×${config.summary.boardSize}`,
        `Выстрелов: ${config.summary.maxShots}`,
        `Попадание: ${config.summary.hitPrizeLabel}`,
        `Флот: ${config.summary.fleet.join(", ")}`,
      ];
    case "lotto":
      return [
        `Диапазон: ${config.summary.range}`,
        `Чисел в карточке: ${config.summary.cardNumbersAmount}`,
        `1 место: ${config.summary.firstPlacePrizeLabel}`,
        `2 место: ${config.summary.secondPlacePrizeLabel}`,
      ];
  }
}

interface GameConfigsPageProps {
  selectedProject: Project | null;
}

export default function GameConfigsPage({ selectedProject }: GameConfigsPageProps) {
  const [gameType, setGameType] = useState<GameType>("journey");
  const [editingConfig, setEditingConfig] = useState<AnyGameConfig | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const { gameConfigs, error, isLoading, isSaving, actions } = useGameConfigs(selectedProject?.id);
  const visibleConfigs = useMemo(() => gameConfigs.filter((config) => config.gameType === gameType), [gameConfigs, gameType]);

  async function openEditor(config: AnyGameConfig) {
    if (!selectedProject) {
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

    setEditorError("Не удалось сохранить конфиг. Проверьте введённые значения и повторите попытку.");
  }

  if (!selectedProject) {
    return <Alert severity="warning">Выберите проект, чтобы просматривать его игровые конфиги.</Alert>;
  }

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
          <Box>
            <PageBreadcrumbs pagePath="/configs" />
            <Typography variant="h4" sx={{ mt: 1 }}>Игровые конфиги</Typography>
            <Typography color="text.secondary">Проект «{selectedProject.name}». Конфиг применяется к новым играм; уже созданные игры хранят свой снимок правил.</Typography>
          </Box>
          <AppPillButton startIcon={<RefreshRoundedIcon />} onClick={() => void actions.loadGameConfigs()} loading={isLoading}>Обновить</AppPillButton>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        <Tabs value={gameType} onChange={(_event, nextValue: GameType) => setGameType(nextValue)} variant="scrollable" allowScrollButtonsMobile>
          {(Object.keys(gameTypeLabels) as GameType[]).map((type) => <Tab key={type} value={type} label={gameTypeLabels[type]} />)}
        </Tabs>

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
        ) : visibleConfigs.length ? (
          <Grid container spacing={2.5}>
            {visibleConfigs.map((config) => (
              <Grid key={config.id} item xs={12} md={6} xl={4}>
                <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Stack spacing={1.25}>
                      <Typography variant="h6">{config.name}</Typography>
                      <Typography variant="body2" color="text.secondary" fontStyle={config.description ? undefined : "italic"}>{config.description || "Описание не добавлено."}</Typography>
                      <Divider />
                      {getSummaryLines(config).map((line) => <Typography key={line} variant="body2">{line}</Typography>)}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <AppPillButton size="small" startIcon={<EditRoundedIcon />} onClick={() => void openEditor(config)}>Открыть и изменить</AppPillButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info">Для игры «{gameTypeLabels[gameType]}» в этом проекте пока нет конфигов.</Alert>
        )}
      </Stack>

      <GameConfigEditorDialog project={selectedProject} gameConfig={editingConfig} open={isEditorOpen} isLoading={isLoadingEditor} isSaving={isSaving} error={editorError} onClose={closeEditor} onSave={saveConfig} />
    </>
  );
}
