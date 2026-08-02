import { useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import GamePageHeader from "../../components/GamePageHeader";
import AppTextInput from "../../components/ui/AppTextInput";
import AppPillButton from "../../components/ui/AppPillButton";
import { useAuth } from "../auth/useAuth";
import { gameConfigsTexts } from "../../texts/gameConfigsTexts";
import type { AnyGameConfig, GameType, Project } from "../projects/types";
import GameConfigCard from "./components/GameConfigCard";
import GameTypeFilterCard from "./components/GameTypeFilterCard";
import { useGameConfigs } from "./hooks/useGameConfigs";

const gameTypes: GameType[] = ["journey", "lotto", "battleships"];

interface GameConfigsPageProps {
  selectedProject: Project | null;
}

export default function GameConfigsPage({ selectedProject }: GameConfigsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [cloneSource, setCloneSource] = useState<AnyGameConfig | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const gameType = gameTypes.find((candidate) => candidate === searchParams.get("gameType")) ?? "journey";
  const { gameConfigs, error, isLoading, isSaving, actions } = useGameConfigs(selectedProject?.id);
  const { user } = useAuth();
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

  function openEditor(config: AnyGameConfig) {
    navigate(`/configs/${config.gameType}/${encodeURIComponent(config.id)}`);
  }

  function openClone(config: AnyGameConfig) {
    setCloneSource(config);
    setCloneName(`${config.name} — копия`);
    setCloneDescription(config.description);
  }

  async function cloneConfig() {
    if (!cloneSource || !cloneName.trim()) return;
    const created = await actions.cloneGameConfig({ sourceConfigId: cloneSource.id, name: cloneName.trim(), description: cloneDescription.trim() });
    if (created) {
      setCloneSource(null);
      openEditor(created);
    }
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
                      onOpen={(nextConfig) => void openEditor(nextConfig)}
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
      <Dialog open={Boolean(cloneSource)} onClose={isSaving ? undefined : () => setCloneSource(null)} fullWidth maxWidth="sm">
        <DialogTitle>Создать конфиг из системного</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">Правила «{cloneSource?.name}» будут скопированы в новый редактируемый конфиг.</Typography>
            <AppTextInput label="Название" value={cloneName} disabled={isSaving} onChange={(event) => setCloneName(event.target.value)} required autoFocus />
            <AppTextInput label="Описание" value={cloneDescription} disabled={isSaving} onChange={(event) => setCloneDescription(event.target.value)} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppPillButton color="inherit" disabled={isSaving} onClick={() => setCloneSource(null)}>Отмена</AppPillButton>
          <AppPillButton variant="contained" loading={isSaving} disabled={!cloneName.trim()} onClick={() => void cloneConfig()}>Создать копию</AppPillButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
