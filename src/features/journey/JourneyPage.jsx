import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  Grid,
  IconButton,
  Paper,
  Popper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  calculateReceiptsDistribution,
  createJourneyGame,
  getJourneyActivePlayers,
  getJourneyCellLabel,
  getJourneyFinishedPlayers,
  getJourneyMapCell,
  getJourneyPlayerFullPrize,
  getJourneyResults,
  getJourneyPlayerTimeline,
  getJourneyVisiblePlayers,
  isJourneyGameOver,
  makeJourneyRound,
  removeJourneyPlayer,
} from "./engine";
import { JOURNEY_ACHIEVEMENTS, JOURNEY_CONFIG, NON_JACKPOT_PRIZES } from "./config";
import { parseMovesFromForum, parsePlayerNamesFromForum } from "./parsers";
import { clearJourneyGame, hasStoredJourneyGame, loadJourneyGame, saveJourneyGame } from "./storage";

function createEmptyMoveState(players = []) {
  return players.reduce((accumulator, player) => {
    accumulator[player.nickname] = "";
    return accumulator;
  }, {});
}

function createEmptySkipState(players = []) {
  return players.reduce((accumulator, player) => {
    accumulator[player.nickname] = false;
    return accumulator;
  }, {});
}

function getPlayerNameErrors(playerNames) {
  const normalizedNames = playerNames.map((name) => name.trim());
  return playerNames.map((name, index) => {
    if (!name.trim()) {
      return "Заполните ник";
    }

    if (normalizedNames.filter((current) => current === normalizedNames[index]).length > 1) {
      return "Ник дублируется";
    }

    return "";
  });
}

function isValidDiceValue(value) {
  const dice = Number(value);
  return Number.isInteger(dice) && dice >= JOURNEY_CONFIG.minDice && dice <= JOURNEY_CONFIG.maxDice;
}

export default function JourneyPage() {
  const [game, setGame] = useState(null);
  const [playerNames, setPlayerNames] = useState([""]);
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [djName, setDjName] = useState(() => localStorage.getItem("combats-dj:dj-name") ?? "");
  const [moveInputs, setMoveInputs] = useState({});
  const [skippedPlayers, setSkippedPlayers] = useState({});
  const [savedGameAvailable, setSavedGameAvailable] = useState(hasStoredJourneyGame());
  const [hoveredCell, setHoveredCell] = useState(null);
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  useEffect(() => {
    localStorage.setItem("combats-dj:dj-name", djName);
  }, [djName]);

  useEffect(() => {
    if (!game) {
      return;
    }

    saveJourneyGame(game);
    setSavedGameAvailable(true);
  }, [game]);

  const playerNameErrors = useMemo(() => getPlayerNameErrors(playerNames), [playerNames]);
  const canStartGame = playerNames.length > 0 && playerNameErrors.every((error) => !error);
  const activePlayers = useMemo(() => (game ? getJourneyActivePlayers(game) : []), [game]);
  const finishedPlayers = useMemo(() => (game ? getJourneyFinishedPlayers(game) : []), [game]);
  const results = useMemo(() => (game ? getJourneyResults(game) : []), [game]);
  const receipts = useMemo(() => (game ? calculateReceiptsDistribution(game) : null), [game]);
  const gameIsOver = game ? isJourneyGameOver(game) : false;

  const canSubmitRound = useMemo(() => {
    if (!activePlayers.length) {
      return false;
    }

    const activeMovePlayers = activePlayers.filter((player) => !skippedPlayers[player.nickname]);
    if (!activeMovePlayers.length) {
      return false;
    }

    return activeMovePlayers.every((player) => isValidDiceValue(moveInputs[player.nickname]));
  }, [activePlayers, moveInputs, skippedPlayers]);

  function resetRoundUi(players = []) {
    setMoveInputs(createEmptyMoveState(players));
    setSkippedPlayers(createEmptySkipState(players));
    setMovesImportText("");
  }

  function handleRestoreGame() {
    const storedGame = loadJourneyGame();
    if (!storedGame) {
      setSavedGameAvailable(false);
      return;
    }

    setGame(storedGame);
    resetRoundUi(getJourneyActivePlayers(storedGame));
  }

  function handleStartGame() {
    const cleanNames = playerNames.map((name) => name.trim()).filter(Boolean);
    const nextGame = createJourneyGame(cleanNames);
    setGame(nextGame);
    resetRoundUi(getJourneyActivePlayers(nextGame));
  }

  function handleRestartGame() {
    clearJourneyGame();
    setSavedGameAvailable(false);
    setGame(null);
    setPlayerNames([""]);
    setPlayersImportText("");
    resetRoundUi([]);
  }

  function handleAddPlayerField() {
    setPlayerNames((current) => [...current, ""]);
  }

  function handlePlayerNameChange(index, value) {
    setPlayerNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function handleRemovePlayerField(index) {
    setPlayerNames((current) => {
      if (current.length === 1) {
        return [""];
      }
      return current.filter((_, nameIndex) => nameIndex !== index);
    });
  }

  function handleImportPlayers() {
    const importedNames = parsePlayerNamesFromForum(playersImportText, djName);
    if (!importedNames.length) {
      return;
    }

    setPlayerNames((current) => {
      const merged = [...current.map((name) => name.trim()).filter(Boolean), ...importedNames];
      return [...new Set(merged)];
    });
  }

  function handleMoveInputChange(nickname, value) {
    setMoveInputs((current) => ({
      ...current,
      [nickname]: value,
    }));
  }

  function handleSkipToggle(nickname) {
    setSkippedPlayers((current) => ({
      ...current,
      [nickname]: !current[nickname],
    }));
  }

  function handleImportMoves() {
    const parsedMoves = parseMovesFromForum(movesImportText);
    if (!Object.keys(parsedMoves).length) {
      return;
    }

    setMoveInputs((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(parsedMoves).map(([nickname, dice]) => [nickname, String(dice)])),
    }));
  }

  function handleSubmitRound() {
    const moves = activePlayers
      .filter((player) => !skippedPlayers[player.nickname])
      .map((player) => ({
        nickname: player.nickname,
        dice: Number(moveInputs[player.nickname]),
      }));

    const skippedNicknames = activePlayers.filter((player) => skippedPlayers[player.nickname]).map((player) => player.nickname);
    const nextGame = makeJourneyRound(game, moves, skippedNicknames);
    setGame(nextGame);
    resetRoundUi(getJourneyActivePlayers(nextGame));
  }

  function handleRemovePlayerFromGame(nickname) {
    const nextGame = removeJourneyPlayer(game, nickname);
    setGame(nextGame);
    setMoveInputs((current) => {
      const nextInputs = { ...current };
      delete nextInputs[nickname];
      return nextInputs;
    });
    setSkippedPlayers((current) => {
      const nextSkipped = { ...current };
      delete nextSkipped[nickname];
      return nextSkipped;
    });
  }

  function getPlayersOnCell(index) {
    if (!game) {
      return [];
    }
    return getJourneyVisiblePlayers(game).filter((player) => player.position === index);
  }

  function getCompactCellLabel(cell) {
    if (!cell) {
      return "·";
    }

    if (cell.isJackpot) {
      return "🏆";
    }

    return cell.prize > 0 ? `+${cell.prize}` : `${cell.prize}`;
  }

  function getCompactCellTone(cell) {
    if (!cell) {
      return {
        backgroundColor: "#ffffff",
        borderColor: "rgba(15, 23, 42, 0.08)",
        color: "#475569",
      };
    }

    if (cell.isJackpot) {
      return {
        backgroundColor: "rgba(245, 158, 11, 0.14)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        color: "#b45309",
      };
    }

    if (cell.prize > 0) {
      return {
        backgroundColor: "rgba(22, 163, 74, 0.12)",
        borderColor: "rgba(22, 163, 74, 0.24)",
        color: "#15803d",
      };
    }

    return {
      backgroundColor: "rgba(220, 38, 38, 0.08)",
      borderColor: "rgba(220, 38, 38, 0.22)",
      color: "#dc2626",
    };
  }

  function shortenNickname(nickname) {
    if (nickname.length <= 10) {
      return nickname;
    }

    return `${nickname.slice(0, 8)}…`;
  }

  function getHistoryEntrySummary(entry) {
    if (entry.skipped) {
      return `Ход ${entry.roundIndex}: пропуск`;
    }

    const movement = `${entry.previousPosition} → ${entry.currentPosition}`;
    const prizePart =
      entry.prizeAfterMove > entry.previousPrize
        ? `+${entry.prizeAfterMove - entry.previousPrize}`
        : entry.prizeAfterMove < entry.previousPrize
          ? `${entry.prizeAfterMove - entry.previousPrize}`
          : "0";
    const cellPart = entry.cell?.isJackpot
      ? "сокровище"
      : entry.cell
        ? entry.cell.prize > 0
          ? `бонус ${entry.cell.prize > 0 ? `+${entry.cell.prize}` : entry.cell.prize}`
          : `ловушка ${entry.cell.prize}`
        : "пусто";

    return `Ход ${entry.roundIndex}: ${movement}, ${cellPart}, изменение ${prizePart}, итог ${entry.fullPrizeAfterRound}`;
  }

  function isTrapProgressEntry(entry) {
    return !entry.skipped && entry.cell && entry.cell.prize < 0;
  }

  function isCarefulProgressEntry(entry) {
    if (entry.skipped || entry.currentPosition === JOURNEY_CONFIG.finishPosition || entry.moveType === "moveWithJackpot") {
      return false;
    }

    if (!entry.cell) {
      return true;
    }

    if (entry.cell.isJackpot) {
      return entry.moveType !== "moveWithJackpot";
    }

    return !entry.cell.prize;
  }

  function isLuckyProgressEntry(entry) {
    return !entry.skipped && entry.cell && entry.cell.prize > 0;
  }

  function getBestStreak(entries, predicate) {
    let current = 0;
    let best = 0;

    entries.forEach((entry) => {
      if (predicate(entry)) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });

    return best;
  }

  function getCurrentStreak(entries, predicate) {
    let current = 0;

    [...entries].reverse().some((entry) => {
      if (predicate(entry)) {
        current += 1;
        return false;
      }

      return true;
    });

    return current;
  }

  function getPrizeBadgeLabel(prize) {
    return prize > 0 ? `+${prize}` : `${prize}`;
  }

  function getAchievementProgress(player, timeline) {
    const obtainedPrizes = [
      ...new Set(
        timeline
          .filter((entry) => !entry.skipped && entry.cell && !entry.cell.isJackpot && typeof entry.cell.prize === "number" && entry.cell.prize !== 0)
          .map((entry) => entry.cell.prize)
      ),
    ];
    const missingPrizes = NON_JACKPOT_PRIZES.filter((prize) => !obtainedPrizes.includes(prize));

    return {
      collector: {
        achieved: player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.COLLECTOR.name),
        obtainedPrizes,
        missingPrizes,
      },
      unlucky: {
        achieved: player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.UNLUCKY.name),
        current: getCurrentStreak(timeline, isTrapProgressEntry),
        best: getBestStreak(timeline, isTrapProgressEntry),
        target: 3,
      },
      careful: {
        achieved: player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.CAREFUL.name),
        current: getCurrentStreak(timeline, isCarefulProgressEntry),
        best: getBestStreak(timeline, isCarefulProgressEntry),
        target: 3,
      },
      lucky: {
        achieved: player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.LUCKY.name),
        current: getCurrentStreak(timeline, isLuckyProgressEntry),
        best: getBestStreak(timeline, isLuckyProgressEntry),
        target: 5,
      },
    };
  }

  const playerTimelines = useMemo(() => {
    if (!game) {
      return {};
    }

    return game.players.reduce((accumulator, player) => {
      accumulator[player.id] = getJourneyPlayerTimeline(game, player.id).map((entry) => ({
        ...entry,
        roundIndex:
          game.rounds.find((round) =>
            (round.entries ?? []).some((roundEntry) => roundEntry.playerId === entry.playerId && roundEntry.createdAt === entry.createdAt)
          )?.moveIndex ?? "—",
      }));
      return accumulator;
    }, {});
  }, [game]);

  const resultsCard = game && gameIsOver ? (
    <Card>
      <CardHeader title="Результаты" subheader="Финальная таблица и размен чеков" />
      <CardContent>
        <Stack spacing={2}>
          <Alert icon={<EmojiEventsRoundedIcon fontSize="inherit" />} severity="success">
            Игра завершена. На финише {finishedPlayers.length} игрок(ов).
          </Alert>
          <Stack spacing={1}>
            {results.map((player, index) => (
              <Box
                key={player.nickname}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  backgroundColor: index === 0 ? "rgba(245, 158, 11, 0.14)" : "rgba(255,255,255,0.64)",
                }}
              >
                <Typography fontWeight={700}>
                  {index + 1}. {player.nickname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {player.fullPrize} {JOURNEY_CONFIG.currency}
                </Typography>
              </Box>
            ))}
          </Stack>
          {receipts ? (
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Размен чеков
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(receipts).map(([amount, count]) => (
                  <Chip key={amount} label={`${amount}: ${count}`} />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  ) : null;

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: "column", xl: "row" }}
                spacing={3}
                justifyContent="space-between"
                alignItems={{ xl: "center" }}
              >
                <Stack spacing={1.5} sx={{ width: "100%", maxWidth: { xl: "50%" }, minWidth: { xl: 520 } }}>
                  <Typography variant="h6">Сессия</Typography>
                  <TextField
                    label="Ник ведущего"
                    value={djName}
                    onChange={(event) => setDjName(event.target.value)}
                    helperText="Нужен только для импорта списка игроков из форумного текста"
                    size="small"
                  />
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ width: "100%", justifyContent: { sm: "space-between" } }}
                  >
                    {!game ? (
                      <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={handleStartGame} disabled={!canStartGame}>
                        Новая игра
                      </Button>
                    ) : null}
                    <Button
                      variant="outlined"
                      startIcon={<RestoreRoundedIcon />}
                      onClick={handleRestoreGame}
                      disabled={!savedGameAvailable}
                    >
                      Восстановить
                    </Button>
                    <Button variant="text" color="inherit" startIcon={<AutorenewRoundedIcon />} onClick={handleRestartGame}>
                      Сбросить
                    </Button>
                  </Stack>
                  {savedGameAvailable && !game ? (
                    <Alert icon={<SaveRoundedIcon fontSize="inherit" />} severity="info">
                      В localStorage есть сохранённая партия.
                    </Alert>
                  ) : null}
                </Stack>
                <Box>
                  <Typography variant="h3">Карта Мародёров</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                    Новый интерфейс игры для ведущего.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          {resultsCard}

          {!game ? (
            <Card>
              <CardHeader title="Игроки" subheader="Можно вручную, можно вставкой из форума" />
              <CardContent>
                <Stack spacing={2}>
                  {playerNames.map((playerName, index) => (
                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                      <TextField
                        fullWidth
                        label={`Игрок ${index + 1}`}
                        value={playerName}
                        onChange={(event) => handlePlayerNameChange(index, event.target.value)}
                        error={Boolean(playerNameErrors[index])}
                        placeholder={playerNameErrors[index] || ""}
                        FormHelperTextProps={{ sx: { display: "none" } }}
                      />
                      <IconButton color="error" onClick={() => handleRemovePlayerField(index)}>
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleAddPlayerField}>
                      Добавить игрока
                    </Button>
                    <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setPlayersImportOpen(true)}>
                      Импорт игроков
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Ходы" subheader="Ходы активных игроков и ручные пропуски" />
              <CardContent>
                <Stack spacing={2}>
                  {activePlayers.length ? (
                    activePlayers.map((player) => (
                      <Stack
                        key={player.nickname}
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        alignItems={{ md: "flex-start" }}
                        sx={{ p: 1.5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" }}
                      >
                        <Box sx={{ minWidth: 160 }}>
                          <Typography fontWeight={700}>{player.nickname}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Клетка {player.position} · {getJourneyPlayerFullPrize(player)} {JOURNEY_CONFIG.currency}
                          </Typography>
                        </Box>
                        <TextField
                          type="number"
                          label="Ход"
                          size="small"
                          value={moveInputs[player.nickname] ?? ""}
                          onChange={(event) => handleMoveInputChange(player.nickname, event.target.value)}
                          disabled={Boolean(skippedPlayers[player.nickname])}
                          inputProps={{ min: JOURNEY_CONFIG.minDice, max: JOURNEY_CONFIG.maxDice }}
                          error={
                            Boolean(moveInputs[player.nickname]) &&
                            !isValidDiceValue(moveInputs[player.nickname]) &&
                            !skippedPlayers[player.nickname]
                          }
                        />
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                          <Typography variant="body2">Пропуск</Typography>
                          <Switch
                            checked={Boolean(skippedPlayers[player.nickname])}
                            onChange={() => handleSkipToggle(player.nickname)}
                          />
                          <Tooltip title="Удалить игрока из текущей партии">
                            <IconButton color="error" onClick={() => handleRemovePlayerFromGame(player.nickname)}>
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    ))
                  ) : (
                    <Alert severity="success">Все игроки уже на финише.</Alert>
                  )}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setMovesImportOpen(true)}>
                      Импорт ходов
                    </Button>
                    <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={handleSubmitRound} disabled={!canSubmitRound}>
                      Применить ход
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title="Rules snapshot" subheader="Текущее состояние правил, заложенное в engine" />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Старт ${JOURNEY_CONFIG.initialPrize}`} color="primary" />
                <Chip label={`Карта ${JOURNEY_CONFIG.mapSize} клеток`} color="secondary" />
                <Chip label={`Ход ${JOURNEY_CONFIG.minDice}-${JOURNEY_CONFIG.maxDice}`} />
                <Chip label={`Сокровище ${JOURNEY_CONFIG.jackpotPrize}`} color="warning" />
                <Chip label="Лимит обычной награды 30" />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.25}>
                {Object.values(JOURNEY_ACHIEVEMENTS)
                  .filter((achievement) => achievement.name !== JOURNEY_ACHIEVEMENTS.JACKPOT.name)
                  .map((achievement) => (
                    <Box key={achievement.name}>
                      <Typography fontWeight={700}>
                        {achievement.title} · +{achievement.prize} {JOURNEY_CONFIG.currency}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.description}
                      </Typography>
                    </Box>
                  ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          <Card>
            <CardHeader title="Карта" subheader="Полная карта ведущего: 50 клеток и позиции игроков" />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip size="small" label="· Пусто" variant="outlined" />
                <Chip size="small" label="+N Бонус" color="success" variant="outlined" />
                <Chip size="small" label="-N Ловушка" color="error" variant="outlined" />
                <Chip size="small" label="🏆 Сокровище" color="warning" variant="outlined" />
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(10, 72px)",
                  columnGap: { xs: 0.75, md: 1.25 },
                  rowGap: { xs: 0.75, md: 1.25 },
                  justifyContent: "space-between",
                  alignItems: "stretch",
                }}
              >
                {Array.from({ length: JOURNEY_CONFIG.mapSize }, (_, index) => index + 1).map((cellIndex) => {
                  const cell = game ? getJourneyMapCell(cellIndex, game.map) : null;
                  const playersOnCell = getPlayersOnCell(cellIndex);
                  const styles = getCompactCellTone(cell);

                  return (
                    <Box
                      key={cellIndex}
                      onMouseEnter={(event) => setHoveredCell({ anchorEl: event.currentTarget, cellIndex, cell, playersOnCell })}
                      onMouseLeave={() => setHoveredCell(null)}
                      sx={{
                        height: 72,
                        px: 0.75,
                        py: 0.5,
                        borderRadius: "6px",
                        border: "1px solid",
                        ...styles,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        overflow: "hidden",
                        transition: "transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease",
                        cursor: "default",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="center" alignItems="flex-start" spacing={0.5} sx={{ position: "relative" }}>
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          sx={{ color: "#0f172a", fontSize: 13, lineHeight: 1, textAlign: "center", width: "100%" }}
                        >
                          {cellIndex}
                        </Typography>
                        {playersOnCell.length ? (
                          <Chip
                            size="small"
                            color="primary"
                            label={playersOnCell.length}
                            sx={{
                              height: 18,
                              position: "absolute",
                              top: -2,
                              right: -4,
                              "& .MuiChip-label": { px: 0.75, fontSize: 10, fontWeight: 700 },
                            }}
                          />
                        ) : null}
                      </Stack>

                      <Box sx={{ display: "grid", placeItems: "center", flex: 1 }}>
                        <Typography variant="body2" fontWeight={800} sx={{ fontSize: 16, lineHeight: 1 }}>
                          {getCompactCellLabel(cell)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ minHeight: 18, justifyContent: "center" }}>
                        {playersOnCell.slice(0, 2).map((player) => (
                          <Avatar
                            key={player.id}
                            sx={{
                              width: 18,
                              height: 18,
                              fontSize: 10,
                              bgcolor: "primary.main",
                            }}
                          >
                            {player.nickname.slice(0, 1).toUpperCase()}
                          </Avatar>
                        ))}
                        {playersOnCell.length > 2 ? (
                          <Chip
                            size="small"
                            label={`+${playersOnCell.length - 2}`}
                            sx={{ height: 18, "& .MuiChip-label": { px: 0.5, fontSize: 10, fontWeight: 700 } }}
                          />
                        ) : null}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
              <Popper
                open={Boolean(hoveredCell?.anchorEl)}
                anchorEl={hoveredCell?.anchorEl}
                placement="top"
                transition
                modifiers={[
                  {
                    name: "offset",
                    options: {
                      offset: [0, 10],
                    },
                  },
                ]}
                sx={{ zIndex: 1500, pointerEvents: "none" }}
              >
                {({ TransitionProps }) => (
                  <Fade {...TransitionProps} timeout={120}>
                    <Paper
                      elevation={10}
                      sx={{
                        width: 280,
                        p: 1.5,
                        borderRadius: 3,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography fontWeight={700}>Клетка {hoveredCell?.cellIndex}</Typography>
                          <Chip
                            size="small"
                            label={getJourneyCellLabel(hoveredCell?.cell)}
                            color={
                              hoveredCell?.cell?.isJackpot
                                ? "warning"
                                : hoveredCell?.cell?.prize > 0
                                  ? "success"
                                  : hoveredCell?.cell?.prize < 0
                                    ? "error"
                                    : "default"
                            }
                            variant="outlined"
                          />
                        </Stack>
                        {hoveredCell?.cell?.isJackpot ? (
                          <Typography variant="body2" color="text.secondary">
                            {hoveredCell.cell?.winner?.nickname
                              ? `Сокровище уже найдено игроком ${hoveredCell.cell.winner.nickname}.`
                              : "Сокровище ещё не найдено."}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {hoveredCell?.cell
                              ? hoveredCell.cell.prize > 0
                                ? `На клетке бонус ${hoveredCell.cell.prize} ${JOURNEY_CONFIG.currency}.`
                                : `На клетке ловушка ${hoveredCell.cell.prize} ${JOURNEY_CONFIG.currency}.`
                              : "Пустая клетка без бонусов и ловушек."}
                          </Typography>
                        )}
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Игроки на клетке
                          </Typography>
                          {hoveredCell?.playersOnCell?.length ? (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                              {hoveredCell.playersOnCell.map((player) => (
                                <Chip key={player.id} size="small" color="primary" label={shortenNickname(player.nickname)} />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Сейчас никого нет.
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  </Fade>
                )}
              </Popper>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Состояние игры" subheader="Актуальные позиции и общий приз игроков" />
            <CardContent>
              {game ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={56}></TableCell>
                      <TableCell>Игрок</TableCell>
                      <TableCell align="right">Клетка</TableCell>
                      <TableCell align="right">База</TableCell>
                      <TableCell align="right">С бонусами</TableCell>
                      <TableCell align="right">Достижения</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {game.players.map((player) => {
                      const isExpanded = expandedPlayerId === player.id;
                      const timeline = playerTimelines[player.id] ?? [];
                      const achievementProgress = getAchievementProgress(player, timeline);

                      return (
                        <Fragment key={player.id}>
                          <TableRow key={player.id}>
                            <TableCell>
                              <IconButton size="small" onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}>
                                {isExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography fontWeight={600}>{player.nickname}</Typography>
                                {player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.JACKPOT.name) ? (
                                  <Chip size="small" color="warning" label="Сокровище" />
                                ) : null}
                                {player.status === "removed" ? <Chip size="small" color="default" label="Удалён" /> : null}
                                {player.status === "finished" ? <Chip size="small" color="success" label="Финиш" /> : null}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{player.position}</TableCell>
                            <TableCell align="right">{player.prize}</TableCell>
                            <TableCell align="right">{getJourneyPlayerFullPrize(player)}</TableCell>
                            <TableCell align="right">
                              {Math.max(player.bonuses.length - Number(player.bonuses.some((bonus) => bonus.name === JOURNEY_ACHIEVEMENTS.JACKPOT.name)), 0)}
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${player.id}-details`}>
                            <TableCell colSpan={6} sx={{ py: 0, borderBottom: isExpanded ? undefined : 0 }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ px: 2, py: 1.5, backgroundColor: "rgba(15, 23, 42, 0.03)" }}>
                                  <Stack spacing={2}>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Прогресс достижений
                                      </Typography>
                                      <Stack spacing={1}>
                                        <Box sx={{ p: 1.25, borderRadius: 2, backgroundColor: "#fff", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                            <Typography variant="body2" fontWeight={700}>
                                              {JOURNEY_ACHIEVEMENTS.COLLECTOR.title}
                                            </Typography>
                                            <Chip
                                              size="small"
                                              color={achievementProgress.collector.achieved ? "success" : "default"}
                                              label={
                                                achievementProgress.collector.achieved
                                                  ? "Получено"
                                                  : `${achievementProgress.collector.obtainedPrizes.length} из ${NON_JACKPOT_PRIZES.length}`
                                              }
                                            />
                                          </Stack>
                                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                            Получено:
                                          </Typography>
                                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                            {achievementProgress.collector.obtainedPrizes.length ? (
                                              achievementProgress.collector.obtainedPrizes.map((prize) => (
                                                <Chip key={`${player.id}-obtained-${prize}`} size="small" color="success" label={getPrizeBadgeLabel(prize)} />
                                              ))
                                            ) : (
                                              <Typography variant="body2" color="text.secondary">
                                                Пока ничего.
                                              </Typography>
                                            )}
                                          </Stack>
                                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                            Не получено:
                                          </Typography>
                                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                            {achievementProgress.collector.missingPrizes.length ? (
                                              achievementProgress.collector.missingPrizes.map((prize) => (
                                                <Chip key={`${player.id}-missing-${prize}`} size="small" variant="outlined" label={getPrizeBadgeLabel(prize)} />
                                              ))
                                            ) : (
                                              <Typography variant="body2" color="text.secondary">
                                                Всё собрано.
                                              </Typography>
                                            )}
                                          </Stack>
                                        </Box>

                                        {[
                                          { key: "unlucky", meta: JOURNEY_ACHIEVEMENTS.UNLUCKY, data: achievementProgress.unlucky },
                                          { key: "careful", meta: JOURNEY_ACHIEVEMENTS.CAREFUL, data: achievementProgress.careful },
                                          { key: "lucky", meta: JOURNEY_ACHIEVEMENTS.LUCKY, data: achievementProgress.lucky },
                                        ].map(({ key, meta, data }) => (
                                          <Box
                                            key={`${player.id}-${key}`}
                                            sx={{ p: 1.25, borderRadius: 2, backgroundColor: "#fff", border: "1px solid rgba(15, 23, 42, 0.08)" }}
                                          >
                                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                              <Typography variant="body2" fontWeight={700}>
                                                {meta.title}
                                              </Typography>
                                              <Chip size="small" color={data.achieved ? "success" : "default"} label={data.achieved ? "Получено" : "В процессе"} />
                                            </Stack>
                                            <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                                              <Typography variant="body2">Текущая серия: {data.current} из {data.target}</Typography>
                                              <Typography variant="body2">Максимум: {data.best} из {data.target}</Typography>
                                            </Stack>
                                          </Box>
                                        ))}
                                      </Stack>
                                    </Box>

                                    <Box>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        История игрока
                                      </Typography>
                                      {timeline.length ? (
                                        <Stack spacing={0.75}>
                                          {[...timeline].reverse().map((entry, index) => (
                                            <Box
                                              key={`${player.id}-${entry.createdAt}-${index}`}
                                              sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                backgroundColor: "#fff",
                                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                              }}
                                            >
                                              <Typography variant="body2">{getHistoryEntrySummary(entry)}</Typography>
                                              {entry.achievementsAwarded?.length ? (
                                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                                                  {entry.achievementsAwarded.map((achievement) => (
                                                    <Chip key={`${player.id}-${achievement.name}-${index}`} size="small" color="secondary" label={achievement.title} />
                                                  ))}
                                                </Stack>
                                              ) : null}
                                            </Box>
                                          ))}
                                        </Stack>
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          История пока пустая.
                                        </Typography>
                                      )}
                                    </Box>
                                  </Stack>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Alert severity="info">Создай или восстанови партию, чтобы увидеть состояние игры.</Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Лог игры" subheader="Пошаговый лог партии с комментариями по раундам" />
            <CardContent>
              {game?.comments?.length ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: "#0f172a",
                    color: "#e2e8f0",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    whiteSpace: "pre-wrap",
                    maxHeight: 520,
                    overflowY: "auto",
                  }}
                >
                  {game.comments.join("\n")}
                </Box>
              ) : (
                <Alert severity="info" icon={<TravelExploreRoundedIcon fontSize="inherit" />}>
                  Лог пока пуст. После первого хода здесь появятся все события партии.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
        </Grid>
      </Grid>

      <Dialog open={playersImportOpen} onClose={() => setPlayersImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Импорт игроков</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Текст с форума"
            multiline
            minRows={10}
            value={playersImportText}
            onChange={(event) => setPlayersImportText(event.target.value)}
            helperText="Поддерживает текущий legacy-формат разбора"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setPlayersImportOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              handleImportPlayers();
              setPlayersImportOpen(false);
            }}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={movesImportOpen} onClose={() => setMovesImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Импорт ходов</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Текст с форума"
            multiline
            minRows={8}
            value={movesImportText}
            onChange={(event) => setMovesImportText(event.target.value)}
            helperText="Legacy-парсер строк ник/число сохранён"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setMovesImportOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              handleImportMoves();
              setMovesImportOpen(false);
            }}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
