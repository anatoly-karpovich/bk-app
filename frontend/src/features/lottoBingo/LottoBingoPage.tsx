import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameActionButton from "../../components/GameActionButton";
import GameConfigSelectField from "../../components/GameConfigSelectField";
import GamePageHeader from "../../components/GamePageHeader";
import SavedGamesDialog from "../../components/SavedGamesDialog";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import AppInfoAlert from "../../components/ui/AppInfoAlert";
import AppResponsiveGrid from "../../components/ui/AppResponsiveGrid";
import { lottoBingoTexts } from "../../texts/lottoBingoTexts";
import type { Project } from "../projects/types";
import LottoBingoCandidatePanel from "./components/LottoBingoCandidatePanel";
import LottoBingoDrawWorkspace from "./components/LottoBingoDrawWorkspace";
import LottoBingoFinalSummary from "./components/LottoBingoFinalSummary";
import LottoBingoRegistrationPanel from "./components/LottoBingoRegistrationPanel";
import LottoBingoRoundOverview from "./components/LottoBingoRoundOverview";
import LottoBingoRulesDialog from "./components/LottoBingoRulesDialog";
import LottoBingoTicketDialog from "./components/LottoBingoTicketDialog";
import LottoBingoTicketsSection from "./components/LottoBingoTicketsSection";
import { formatLottoBingoTimestamp, getLottoBingoPhaseLabel } from "./lottoBingo.helpers";
import { getLottoBingoConfirmationCopy, type LottoBingoConfirmation } from "./lottoBingoPage.helpers";
import { useLottoBingoGame } from "./hooks/useLottoBingoGame";
import type { LottoBingoPlayer } from "./types";

type Confirmation = LottoBingoConfirmation | null;

const statusLabels = {
  preparing: "Подготовка",
  in_progress: "В процессе",
  finished: "Завершена",
} as const;

export default function LottoBingoPage({ selectedProject }: { selectedProject: Project | null }) {
  const navigate = useNavigate();
  const {
    game,
    configs,
    selectedConfigId,
    savedGames,
    loading,
    isLoadingSavedGames,
    isRefreshing,
    busy,
    error,
    savedGamesError,
    observing,
    actions,
  } = useLottoBingoGame({
    selectedProject,
  });
  const [playerName, setPlayerName] = useState("");
  const [savedOpen, setSavedOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation>(null);
  const [targetPlayer, setTargetPlayer] = useState<LottoBingoPlayer | null>(null);
  const [openedTicket, setOpenedTicket] = useState<LottoBingoPlayer | null>(null);
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openSaved = async () => {
    setSavedOpen(true);
    await actions.loadSavedGames();
  };
  const addPlayer = async () => {
    if (!playerName.trim()) return;
    const saved = await actions.addPlayer(playerName.trim());
    if (saved) setPlayerName("");
  };
  const resetUi = () => {
    setPlayerName("");
    setSelectedWinnerIds([]);
    setTargetPlayer(null);
    setOpenedTicket(null);
    setConfirm(null);
    actions.resetUi();
  };
  const confirmAction = async () => {
    if (confirm === "start") await actions.start();
    if (confirm === "draw") await actions.draw();
    if (confirm === "winners") {
      const saved = await actions.confirmWinners(selectedWinnerIds);
      if (saved) setSelectedWinnerIds([]);
    }
    if (confirm === "finalize") await actions.finalize();
    if (confirm === "delete" && deleteId) await actions.deleteGame(deleteId);
    if (confirm === "remove" && targetPlayer) await actions.removePlayer(targetPlayer);
    if (confirm === "disqualify" && targetPlayer) await actions.disqualify(targetPlayer);
    setConfirm(null);
    setTargetPlayer(null);
    setDeleteId(null);
  };

  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть Лото Бинго.</Alert>;
  if (loading)
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );

  const access = game?.meta.access;
  const selectedConfig = configs.find((config) => config.id === (game?.meta.configId ?? selectedConfigId)) ?? null;
  const rules = game?.configuration.rules ?? selectedConfig?.rules ?? null;
  const ruleResources = game?.configuration.resources ?? selectedProject.resources;
  const savedGameItems = savedGames.map((savedGame) => ({
    id: savedGame.id,
    title: savedGame.meta.configName,
    statusLabel: statusLabels[savedGame.meta.status],
    statusColor: savedGame.meta.status === "finished" ? ("success" as const) : ("info" as const),
    metadata: `Игроков: ${savedGame.state.playersCount} · Бочонков: ${savedGame.state.drawnBarrelsCount} · Ведущий: ${savedGame.meta.host.nickname}`,
    createdAtLabel: formatLottoBingoTimestamp(savedGame.createdAt),
    updatedAtLabel: formatLottoBingoTimestamp(savedGame.updatedAt),
    details: (
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Фаза: {getLottoBingoPhaseLabel(savedGame.meta.phase)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Подтверждённых победителей: {Object.values(savedGame.state.winners).flat().length}
        </Typography>
      </Stack>
    ),
  }));
  const ticketActions =
    game && access
      ? {
          players: game.state.players,
          candidates: game.state.round.candidates,
          canDisqualify: access.canDisqualifyPlayer,
          canRestore: access.canRestorePlayer,
          canRemove: access.canRemovePlayer,
          disabled: busy,
          onDisqualify: (player: LottoBingoPlayer) => {
            setTargetPlayer(player);
            setConfirm("disqualify");
          },
          onRestore: (player: LottoBingoPlayer) => void actions.restore(player),
          onRemove: (player: LottoBingoPlayer) => {
            setTargetPlayer(player);
            setConfirm("remove");
          },
          onOpen: setOpenedTicket,
        }
      : null;
  const confirmationCopy = confirm
    ? getLottoBingoConfirmationCopy({
        confirmation: confirm,
        selectedWinnersCount: selectedWinnerIds.length,
        targetPlayerName: targetPlayer?.nickname ?? null,
        requiresDrawWithoutWinnerConfirmation: Boolean(game?.state.round.requiresDrawWithoutWinnerConfirmation),
      })
    : null;

  return (
    <>
      <AppResponsiveGrid columns={{ xs: 1 }} gap={3}>
        <GamePageHeader
          breadcrumbPath="/lotto-bingo"
          title={lottoBingoTexts.title}
          chips={
            game
              ? [
                  {
                    label: statusLabels[game.meta.status],
                    color:
                      game.meta.status === "finished"
                        ? "success"
                        : game.meta.status === "preparing"
                          ? "default"
                          : "secondary",
                  },
                  { label: getLottoBingoPhaseLabel(game.meta.phase), color: "primary" },
                  {
                    label: `Бочонков: ${game.state.draw.drawnCount}/${game.state.draw.plannedDrawCount}`,
                    color: "secondary",
                  },
                  { label: `Игроков: ${game.state.players.length}`, color: "info" },
                  { label: `Ведущий: ${game.meta.host.nickname}`, color: "info" },
                ]
              : [{ label: "Новая игра" }]
          }
          controls={
            <GameConfigSelectField
              gameConfigs={configs}
              selectedGameConfigId={game?.meta.configId ?? selectedConfigId}
              onSelectedGameConfigChange={actions.setConfig}
              disabled={Boolean(game)}
              hideHelperText
              sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "rgba(255,255,255,.94)" } }}
            />
          }
          actions={[
            {
              key: "refresh",
              label: lottoBingoTexts.refresh,
              icon: <RefreshRoundedIcon />,
              onClick: () => void actions.reload(),
              disabled: busy || isRefreshing || !game,
              loading: isRefreshing,
              variant: "outlined",
            },
            {
              key: "saved-games",
              label: lottoBingoTexts.savedGames,
              icon: <RestoreRoundedIcon />,
              onClick: () => void openSaved(),
              disabled: busy,
              variant: "outlined",
            },
          ]}
          moreActions={[
            {
              key: "rules",
              label: "Правила",
              icon: <MenuBookRoundedIcon fontSize="small" />,
              onClick: () => setRulesOpen(true),
              disabled: !rules,
            },
            {
              key: "reset",
              label: "Сбросить рабочий экран",
              icon: <AutorenewRoundedIcon fontSize="small" />,
              onClick: resetUi,
              disabled: !game,
              dividerBefore: true,
            },
          ]}
          moreActionsDisabled={busy}
        />

        {error ? (
          <Alert severity="error" onClose={() => actions.setError(null)}>
            {error}
          </Alert>
        ) : null}

        {!configs.length && !game ? (
          <Card>
            <CardContent>
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography variant="h5">Нет конфигурации</Typography>
                <Typography color="text.secondary">{lottoBingoTexts.noConfig}</Typography>
                <GameActionButton
                  label={lottoBingoTexts.createConfig}
                  icon={<CasinoRoundedIcon />}
                  disabled={false}
                  onClick={() => navigate("/configs?gameType=lotto_bingo")}
                  variant="contained"
                />
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {!game && configs.length ? (
          <Card>
            <CardContent>
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography variant="h5">Новая игра</Typography>
                <Typography variant="body2" color="text.secondary">
                  Создайте игру из выбранной конфигурации, затем зарегистрируйте игроков. Билеты сгенерирует сервер при
                  добавлении игрока.
                </Typography>
                <GameActionButton
                  label={lottoBingoTexts.createGame}
                  icon={<AddRoundedIcon />}
                  disabled={busy || !selectedConfigId}
                  onClick={() => void actions.createGame()}
                  variant="contained"
                />
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {game && access && ticketActions ? (
          <>
            {access.mode === "read_only" ? (
              <AppInfoAlert>
                Режим наблюдения. Управляющие действия недоступны; состояние можно обновлять вручную или в реальном
                времени.
              </AppInfoAlert>
            ) : null}

            {game.meta.status === "preparing" ? (
              <AppResponsiveGrid columns={{ xs: 1, lg: 3 }} gap={3}>
                <LottoBingoRegistrationPanel
                  players={game.state.players}
                  playerName={playerName}
                  busy={busy}
                  canAddPlayer={access.canAddPlayer}
                  canStart={access.canStart}
                  onPlayerNameChange={setPlayerName}
                  onAddPlayer={() => void addPlayer()}
                  onStart={() => setConfirm("start")}
                />
                <Box sx={{ gridColumn: { lg: "span 2" } }}>
                  <LottoBingoTicketsSection {...ticketActions} isRegistration />
                </Box>
              </AppResponsiveGrid>
            ) : (
              <>
                <LottoBingoDrawWorkspace
                  game={game}
                  busy={busy}
                  onDraw={() => void actions.draw()}
                  onConfirmDraw={() => setConfirm("draw")}
                  onUndo={() => void actions.undo()}
                  onFinalize={() => setConfirm("finalize")}
                  observing={observing}
                  onToggleObservation={() => actions.setLiveObservation(!observing)}
                />
                <AppResponsiveGrid columns={{ xs: 1, lg: 3 }} gap={3}>
                  <LottoBingoRoundOverview game={game} />
                  {game.meta.status === "finished" ? (
                    <LottoBingoFinalSummary game={game} />
                  ) : (
                    <LottoBingoCandidatePanel
                      game={game}
                      busy={busy}
                      selectedWinnerIds={selectedWinnerIds}
                      onSelectedWinnerIdsChange={setSelectedWinnerIds}
                      onConfirm={() => setConfirm("winners")}
                    />
                  )}
                </AppResponsiveGrid>
                <LottoBingoTicketsSection {...ticketActions} />
              </>
            )}
          </>
        ) : null}
      </AppResponsiveGrid>

      <LottoBingoRulesDialog
        open={rulesOpen}
        rules={rules}
        resources={ruleResources}
        onClose={() => setRulesOpen(false)}
      />
      <SavedGamesDialog
        open={savedOpen}
        games={savedGameItems}
        currentGameId={game?.id ?? null}
        loading={isLoadingSavedGames}
        restoreLoading={busy}
        deletingGameId={busy && deleteId ? deleteId : null}
        error={savedGamesError}
        onClose={() => setSavedOpen(false)}
        onRestore={(id) =>
          void actions.restoreGame(id).then((value) => {
            if (value) setSavedOpen(false);
          })
        }
        onDelete={(id) => {
          setDeleteId(id);
          setConfirm("delete");
        }}
      />
      <LottoBingoTicketDialog
        player={openedTicket}
        candidate={game?.state.round.candidates.find((candidate) => candidate.playerId === openedTicket?.id)}
        onClose={() => setOpenedTicket(null)}
      />
      <AppConfirmDialog
        open={Boolean(confirm)}
        title={confirmationCopy?.title ?? ""}
        description={confirmationCopy?.description ?? ""}
        confirmLabel={confirmationCopy?.confirmLabel ?? "Подтвердить"}
        cancelLabel="Отмена"
        confirmColor={confirmationCopy?.confirmColor ?? "primary"}
        loading={busy}
        onClose={() => {
          if (!busy) {
            setConfirm(null);
            setTargetPlayer(null);
          }
        }}
        onConfirm={() => void confirmAction()}
      />
    </>
  );
}
