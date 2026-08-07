import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { Alert, Card, CardContent, CircularProgress, FormControlLabel, MenuItem, Stack, Switch, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddPlayerButton from "../../components/AddPlayerButton";
import GameActionButton from "../../components/GameActionButton";
import GameConfigSelectField from "../../components/GameConfigSelectField";
import GamePageHeader from "../../components/GamePageHeader";
import GamePlayerNameInput from "../../components/players/GamePlayerNameInput";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import AppInfoAlert from "../../components/ui/AppInfoAlert";
import AppResponsiveGrid from "../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../rewards/resourceAmounts";
import type { Project } from "../projects/types";
import { lottoBingoTexts } from "../../texts/lottoBingoTexts";
import LottoBingoSavedGamesDialog from "./components/LottoBingoSavedGamesDialog";
import LottoBingoTicketGrid from "./components/LottoBingoTicketGrid";
import { useLottoBingoGame } from "./hooks/useLottoBingoGame";
import type { LottoBingoPlayer } from "./types";

export default function LottoBingoPage({ selectedProject }: { selectedProject: Project | null }) {
  const navigate = useNavigate();
  const { game, configs, selectedConfigId, savedGames, loading, busy, error, observing, actions } = useLottoBingoGame({ selectedProject });
  const [playerName, setPlayerName] = useState(""); const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [savedOpen, setSavedOpen] = useState(false); const [confirm, setConfirm] = useState<"start" | "draw" | "winners" | "finalize" | "delete" | "remove" | "disqualify" | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<LottoBingoPlayer | null>(null); const [selectedWinnerIds, setSelectedWinnerIds] = useState<string[]>([]); const [deleteId, setDeleteId] = useState<string | null>(null);
  const visiblePlayers = useMemo(() => game?.state.players.filter((player) => (status === "all" || (status === "candidate" ? player.eligibility.isCurrentRoundCandidate : player.status === status)) && player.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [], [game?.state.players, query, status]);
  const openSaved = async () => { setSavedOpen(true); await actions.loadSavedGames(); };
  const addPlayer = async () => { if (!playerName.trim()) return; const saved = await actions.addPlayer(playerName.trim()); if (saved) setPlayerName(""); };
  const confirmAction = async () => {
    if (confirm === "start") await actions.start();
    if (confirm === "draw") await actions.draw();
    if (confirm === "winners") { const saved = await actions.confirmWinners(selectedWinnerIds); if (saved) setSelectedWinnerIds([]); }
    if (confirm === "finalize") await actions.finalize();
    if (confirm === "delete" && deleteId) { if (await actions.deleteGame(deleteId)) setSavedOpen(false); }
    if (confirm === "remove" && targetPlayer) await actions.removePlayer(targetPlayer);
    if (confirm === "disqualify" && targetPlayer) await actions.disqualify(targetPlayer);
    setConfirm(null); setTargetPlayer(null); setDeleteId(null);
  };
  if (!selectedProject) return <Alert severity="warning">Выберите проект, чтобы открыть Лото Бинго.</Alert>;
  if (loading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  const access = game?.meta.access;
  return <>
    <AppResponsiveGrid columns={{ xs: 1 }} gap={3}>
      <GamePageHeader breadcrumbPath="/lotto-bingo" title={lottoBingoTexts.title} description={lottoBingoTexts.description} chips={game ? [{ label: game.meta.phase, color: game.meta.status === "finished" ? "success" : "info" }, { label: `Раунд: ${game.state.round.activeRound ?? "—"}`, color: "secondary" }, { label: `Бочонков: ${game.state.draw.drawnCount}/${game.state.draw.plannedDrawCount}` }] : [{ label: "Новая игра" }]} controls={!game ? <GameConfigSelectField label="Конфигурация" gameConfigs={configs} selectedGameConfigId={selectedConfigId} onSelectedGameConfigChange={actions.setConfig} /> : undefined} actions={[{ key: "refresh", label: lottoBingoTexts.refresh, icon: <RefreshRoundedIcon />, onClick: () => void actions.reload(), disabled: busy || !game, variant: "outlined" }, { key: "saved", label: lottoBingoTexts.savedGames, icon: <RestoreRoundedIcon />, onClick: () => void openSaved(), disabled: busy, variant: "outlined" }, ...(game?.meta.access.mode === "read_only" ? [{ key: "observe", label: observing ? "Остановить наблюдение" : lottoBingoTexts.observe, icon: <RefreshRoundedIcon />, onClick: () => actions.setLiveObservation(!observing), disabled: busy, variant: "text" as const }] : [])]} />
      {error ? <Alert severity="error" onClose={() => actions.setError(null)}>{error}</Alert> : null}
      {!configs.length && !game ? <Card><CardContent><Stack spacing={1.5} alignItems="flex-start"><Typography variant="h5">Нет конфигурации</Typography><Typography color="text.secondary">{lottoBingoTexts.noConfig}</Typography><GameActionButton label={lottoBingoTexts.createConfig} icon={<CasinoRoundedIcon />} disabled={false} onClick={() => navigate("/configs?gameType=lotto_bingo")} variant="contained" /></Stack></CardContent></Card> : null}
      {!game && configs.length ? <Card><CardContent><Stack spacing={1.5}><Typography variant="h5">Новая игра</Typography><Typography variant="body2" color="text.secondary">Создайте игру из выбранной конфигурации, затем зарегистрируйте игроков. Билеты создаются сервером сразу при регистрации.</Typography><GameActionButton label={lottoBingoTexts.createGame} icon={<AddRoundedIcon />} disabled={busy || !selectedConfigId} onClick={() => void actions.createGame()} variant="contained" /></Stack></CardContent></Card> : null}
      {game ? <>
        {access?.mode === "read_only" ? <AppInfoAlert>Режим наблюдения: состояние и доступные действия определяет сервер. Для обновлений включите наблюдение или используйте «Обновить».</AppInfoAlert> : null}
        <AppResponsiveGrid columns={{ xs: 1, lg: 2 }} gap={3}>
          <Card><CardContent><Stack spacing={1.5}><Typography variant="h5">Текущий бочонок</Typography><Typography variant="h2">{game.state.draw.currentBarrel ?? "—"}</Typography><Typography color="text.secondary">Осталось в плановом тираже: {game.state.draw.plannedRemainingCount}. Вне игры: {game.state.draw.outOfGameCount}.</Typography><Stack direction="row" spacing={1} flexWrap="wrap"><GameActionButton label="Вытянуть бочонок" icon={<CasinoRoundedIcon />} disabled={busy || !access!.canDraw} onClick={() => game.state.round.requiresDrawWithoutWinnerConfirmation ? setConfirm("draw") : void actions.draw()} variant="contained" />{access!.canUndoDraw ? <GameActionButton label="Отменить" icon={<UndoRoundedIcon />} disabled={busy} onClick={() => void actions.undo()} /> : null}{access!.canFinalize ? <GameActionButton label="Финализировать" icon={<CheckCircleRoundedIcon />} disabled={busy} onClick={() => setConfirm("finalize")} /> : null}</Stack></Stack></CardContent></Card>
          <Card><CardContent><Stack spacing={1.5}><Typography variant="h5">Регистрация и раунд</Typography>{game.meta.status === "preparing" ? <><GamePlayerNameInput label="Ник игрока" value={playerName} onChange={setPlayerName} disabled={busy || !access!.canAddPlayer} helperTextMode="visible" errorText={!playerName.trim() ? "Введите ник игрока" : null} /><Stack direction="row" spacing={1} flexWrap="wrap"><AddPlayerButton disabled={busy || !access!.canAddPlayer || !playerName.trim()} onClick={() => void addPlayer()} /><GameActionButton label="Начать игру" icon={<PlayArrowRoundedIcon />} disabled={busy || !access!.canStart} onClick={() => setConfirm("start")} variant="contained" /></Stack></> : <Typography color="text.secondary">Активный раунд: {game.state.round.activeRound ? `№ ${game.state.round.activeRound}` : "все основные раунды завершены"}. Зарегистрированных игроков: {game.state.players.length}.</Typography>}</Stack></CardContent></Card>
        </AppResponsiveGrid>
        <AppResponsiveGrid columns={{ xs: 1, xl: 2 }} gap={3}>
          <Card><CardContent><Stack spacing={1.5}><Typography variant="h5">Кандидаты текущего раунда</Typography>{!game.state.round.candidates.length ? <AppInfoAlert>Подходящих кандидатов пока нет.</AppInfoAlert> : <>{game.state.round.candidates.map((candidate) => <FormControlLabel key={candidate.playerId} control={<Switch checked={selectedWinnerIds.includes(candidate.playerId)} onChange={(_, checked) => setSelectedWinnerIds((ids) => checked ? [...ids, candidate.playerId] : ids.filter((id) => id !== candidate.playerId))} disabled={busy || !access!.canConfirmWinner} />} label={`${candidate.nickname} · с бочонка ${candidate.eligibleSinceDraw}`} />)}<GameActionButton label="Подтвердить победителей" icon={<CheckCircleRoundedIcon />} disabled={busy || !access!.canConfirmWinner || !selectedWinnerIds.length} onClick={() => setConfirm("winners")} variant="contained" /></>}</Stack></CardContent></Card>
          <Card><CardContent><Stack spacing={1.5}><Typography variant="h5">Награды и история</Typography>{game.state.rewards.finalPreview ? <Typography variant="body2" color="text.secondary">Финальный preview доступен: заполненные билеты — {game.state.rewards.finalPreview.completedCardPlayers.length}, утешительные — {game.state.rewards.finalPreview.consolationPlayers.length}.</Typography> : null}{game.state.rewards.finalPayouts.map((payout) => <Typography key={payout.id} variant="body2">{payout.nickname}: {formatResourceAmounts(payout.resolvedRewards, game.configuration.resources)}</Typography>)}{game.state.timeline.slice(-4).reverse().map((event) => <Typography key={event.id} variant="caption" color="text.secondary">{event.message} · {event.actorName}</Typography>)}</Stack></CardContent></Card>
        </AppResponsiveGrid>
        <Card><CardContent><Stack spacing={2}><Stack direction={{ xs: "column", md: "row" }} spacing={1}><AppTextInput fullWidth size="small" label="Поиск игрока" value={query} onChange={(event) => setQuery(event.target.value)} /><AppTextInput select size="small" label="Статус" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: { md: 210 } }}>{[["all", "Все"], ["candidate", "Кандидаты"], ["active", "Активные"], ["round_winner", "Победители"], ["disqualified", "Дисквалифицированные"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</AppTextInput></Stack><Typography variant="h5">Билеты ({visiblePlayers.length})</Typography><LottoBingoTicketGrid players={visiblePlayers} candidates={game.state.round.candidates} canDisqualify={Boolean(access?.canDisqualifyPlayer)} canRestore={Boolean(access?.canRestorePlayer)} canRemove={Boolean(access?.canRemovePlayer)} disabled={busy} onDisqualify={(player) => { setTargetPlayer(player); setConfirm("disqualify"); }} onRestore={(player) => void actions.restore(player)} onRemove={(player) => { setTargetPlayer(player); setConfirm("remove"); }} /></Stack></CardContent></Card>
      </> : null}
    </AppResponsiveGrid>
    <LottoBingoSavedGamesDialog open={savedOpen} games={savedGames} currentId={game?.id ?? null} disabled={busy} onClose={() => setSavedOpen(false)} onRestore={(id) => void actions.restoreGame(id).then((value) => { if (value) setSavedOpen(false); })} onDelete={(id) => { setDeleteId(id); setConfirm("delete"); }} />
    <AppConfirmDialog open={Boolean(confirm)} title={confirm === "start" ? "Начать игру?" : confirm === "draw" ? "Вытянуть следующий бочонок?" : confirm === "winners" ? "Подтвердить победителей?" : confirm === "finalize" ? "Финализировать игру?" : confirm === "delete" ? "Удалить игру?" : confirm === "remove" ? "Удалить игрока?" : "Дисквалифицировать игрока?"} description={confirm === "start" ? "Регистрация закроется, а порядок бочонков будет зафиксирован." : confirm === "draw" && game?.state.round.requiresDrawWithoutWinnerConfirmation ? "Есть неподтверждённые кандидаты. Следующий бочонок не отменит их право на победу, но проверьте чат перед продолжением." : confirm === "winners" ? `Будут подтверждены: ${selectedWinnerIds.length}. Раунд перейдёт к следующему этапу.` : confirm === "finalize" ? "Награды финальных категорий будут разрешены и сохранены. Игра станет неизменяемой." : confirm === "delete" ? "Игра будет удалена безвозвратно." : `${targetPlayer?.nickname ?? "Игрок"}: действие изменит состояние игры.`} confirmLabel={confirm === "delete" ? "Удалить" : "Подтвердить"} cancelLabel="Отмена" confirmColor={confirm === "delete" ? "error" : "primary"} loading={busy} onClose={() => { if (!busy) { setConfirm(null); setTargetPlayer(null); } }} onConfirm={() => void confirmAction()} />
  </>;
}
