import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  Tooltip,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
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
  getJourneyPlayerTimeline,
  getJourneyResults,
  getJourneyVisiblePlayers,
  isJourneyGameOver,
  makeJourneyRound,
  removeJourneyPlayer,
} from "./engine";
import { getJourneyAchievements, getJourneyConfig, getNonJackpotPrizes } from "./config";
import { parseMovesFromForum, parsePlayerNamesFromForum } from "./parsers";
import { clearJourneyGame, hasStoredJourneyGame, loadJourneyGame, saveJourneyGame } from "./storage";
import { journeyTexts } from "../../texts/journeyTexts";
import AppBreadcrumbs from "../../components/ui/AppBreadcrumbs";
import AppChip from "../../components/ui/AppChip";
import AppPillButton from "../../components/ui/AppPillButton";
import AppTextInput from "../../components/ui/AppTextInput";
import type {
  JourneyAchievement,
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyGame,
  JourneyMapCell,
  JourneyMoveInputs,
  JourneyPlayer,
  JourneyReceiptsDistribution,
  JourneyRuleset,
  JourneySkippedPlayers,
  JourneyTimelineEntry,
} from "./types";

function createEmptyMoveState(players: JourneyPlayer[] = []): JourneyMoveInputs {
  return players.reduce<JourneyMoveInputs>((accumulator, player) => {
    accumulator[player.nickname] = "";
    return accumulator;
  }, {});
}

function createEmptySkipState(players: JourneyPlayer[] = []): JourneySkippedPlayers {
  return players.reduce<JourneySkippedPlayers>((accumulator, player) => {
    accumulator[player.nickname] = false;
    return accumulator;
  }, {});
}

function getPlayerNameErrors(playerNames: string[]): string[] {
  const normalizedNames = playerNames.map((name) => name.trim());

  return playerNames.map((name, index) => {
    if (!name.trim()) {
      return journeyTexts.validation.fillNickname;
    }

    if (normalizedNames.filter((current) => current === normalizedNames[index]).length > 1) {
      return journeyTexts.validation.duplicateNickname;
    }

    return "";
  });
}

function isValidDiceValue(value: string, journeyConfig: JourneyConfig): boolean {
  const dice = Number(value);
  return Number.isInteger(dice) && dice >= journeyConfig.minDice && dice <= journeyConfig.maxDice;
}

function isTrapProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && entry.cell && entry.cell.prize < 0;
}

function isLuckyProgressEntry(entry: JourneyTimelineEntry): boolean {
  return !entry.skipped && entry.cell && entry.cell.prize > 0;
}

function getBestStreak(entries: JourneyTimelineEntry[], predicate: (entry: JourneyTimelineEntry) => boolean): number {
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

function getCurrentStreak(entries: JourneyTimelineEntry[], predicate: (entry: JourneyTimelineEntry) => boolean): number {
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

function getPrizeBadgeLabel(prize: number): string {
  return prize > 0 ? `+${prize}` : `${prize}`;
}

function JourneyRulesSummary({
  journeyConfig,
  journeyAchievements,
}: {
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
}) {
  const achievementList = Object.values(journeyAchievements) as JourneyAchievement[];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <AppChip label={`${journeyTexts.rulesChips.startPrefix} ${journeyConfig.initialPrize}`} color="primary" />
        <AppChip label={`${journeyTexts.rulesChips.mapPrefix} ${journeyConfig.mapSize} ${journeyTexts.rulesChips.mapSuffix}`} color="secondary" />
        <AppChip label={`${journeyTexts.rulesChips.movePrefix} ${journeyConfig.minDice}-${journeyConfig.maxDice}`} />
        <AppChip label={`${journeyTexts.rulesChips.jackpotPrefix} ${journeyConfig.jackpotPrize}`} color="warning" />
        {Number.isFinite(journeyConfig.maxPrize) ? (
          <AppChip label={`${journeyTexts.rulesChips.prizeLimitPrefix} ${journeyConfig.maxPrize}`} />
        ) : (
          <AppChip label={journeyTexts.rulesChips.noPrizeLimit} />
        )}
      </Stack>

      <Divider />

      <Stack spacing={1.25}>
        {achievementList
          .filter((achievement) => achievement.name !== journeyAchievements.JACKPOT.name)
          .map((achievement) => (
            <Box key={achievement.name}>
              <Typography fontWeight={700}>
                {achievement.title} · +{achievement.prize} {journeyConfig.currency}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {achievement.description}
              </Typography>
            </Box>
          ))}
      </Stack>
    </Stack>
  );
}

interface JourneyPageProps {
  djName: string;
  defaultRuleset: JourneyRuleset;
}

interface HoveredCellState {
  anchorEl: HTMLElement;
  cellIndex: number;
  cell: JourneyMapCell | null;
  playersOnCell: JourneyPlayer[];
}

type StatusChip = {
  label: string;
  color?: ChipProps["color"];
};

export default function JourneyPage({ djName, defaultRuleset }: JourneyPageProps) {
  const [game, setGame] = useState<JourneyGame | null>(null);
  const [playerNames, setPlayerNames] = useState([""]);
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [moveInputs, setMoveInputs] = useState<JourneyMoveInputs>({});
  const [skippedPlayers, setSkippedPlayers] = useState<JourneySkippedPlayers>({});
  const [savedGameAvailable, setSavedGameAvailable] = useState(hasStoredJourneyGame());
  const [hoveredCell, setHoveredCell] = useState<HoveredCellState | null>(null);
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!game) {
      return;
    }

    saveJourneyGame(game);
    setSavedGameAvailable(true);
  }, [game]);

  const playerNameErrors = useMemo(() => getPlayerNameErrors(playerNames), [playerNames]);
  const journeyRules = useMemo(() => game?.rules ?? defaultRuleset.rules, [defaultRuleset.rules, game]);
  const journeyConfig = useMemo(() => getJourneyConfig(journeyRules), [journeyRules]);
  const journeyAchievements = useMemo(() => getJourneyAchievements(journeyRules), [journeyRules]);
  const nonJackpotPrizes = useMemo(() => getNonJackpotPrizes(journeyRules), [journeyRules]);
  const canStartGame = playerNames.length > 0 && playerNameErrors.every((error) => !error);

  const activePlayers = useMemo(() => (game ? getJourneyActivePlayers(game) : []), [game]);
  const finishedPlayers = useMemo(() => (game ? getJourneyFinishedPlayers(game) : []), [game]);
  const results = useMemo(() => (game ? getJourneyResults(game) : []), [game]);
  const receipts = useMemo<JourneyReceiptsDistribution | null>(() => (game ? calculateReceiptsDistribution(game) : null), [game]);
  const gameIsOver = game ? isJourneyGameOver(game) : false;
  const activeGame = Boolean(game && !gameIsOver);
  const totalGamePlayers = useMemo(
    () => (game ? game.players.filter((player) => player.status !== "removed").length : 0),
    [game],
  );

  const canSubmitRound = useMemo(() => {
    if (!activePlayers.length) {
      return false;
    }

    const activeMovePlayers = activePlayers.filter((player) => !skippedPlayers[player.nickname]);
    if (!activeMovePlayers.length) {
      return false;
    }

    return activeMovePlayers.every((player) => isValidDiceValue(moveInputs[player.nickname], journeyConfig));
  }, [activePlayers, journeyConfig, moveInputs, skippedPlayers]);

  const playerTimelines = useMemo<Record<string, JourneyTimelineEntry[]>>(() => {
    if (!game) {
      return {};
    }

    return game.players.reduce((accumulator, player) => {
      accumulator[player.id] = getJourneyPlayerTimeline(game, player.id).map((entry) => ({
        ...entry,
        roundIndex:
          game.rounds.find((round) =>
            (round.entries ?? []).some((roundEntry) => roundEntry.playerId === entry.playerId && roundEntry.createdAt === entry.createdAt),
          )?.moveIndex ?? "—",
      }));

      return accumulator;
    }, {});
  }, [game]);

  const pageStatusChips = useMemo<StatusChip[]>(() => {
    const rulesetLabel: StatusChip = {
      label: `${journeyTexts.statuses.rulesetPrefix} ${game ? game.rulesetName : defaultRuleset.name}`,
      color: "secondary",
    };

    if (!game) {
      return [{ label: journeyTexts.statuses.notStarted, color: "default" }, rulesetLabel];
    }

    const chips: StatusChip[] = [
      {
        label: gameIsOver ? journeyTexts.statuses.complete : journeyTexts.statuses.active,
        color: gameIsOver ? "success" : "default",
      },
      rulesetLabel,
    ];

    if (activeGame) {
      chips.push({ label: `${journeyTexts.statuses.roundPrefix} ${game.rounds.length}`, color: "primary" });
      chips.push({ label: `${totalGamePlayers} ${journeyTexts.statuses.playersSuffix}`, color: "info" });
    }

    return chips;
  }, [activeGame, defaultRuleset.name, game, gameIsOver, totalGamePlayers]);

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
    const nextGame = createJourneyGame(cleanNames, {
      rules: defaultRuleset.rules,
      rulesetId: defaultRuleset.id,
      rulesetName: defaultRuleset.name,
    });

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

  function handleMoveInputChange(nickname: string, value: string) {
    setMoveInputs((current) => ({
      ...current,
      [nickname]: value,
    }));
  }

  function handleSkipToggle(nickname: string) {
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

  function handleRemovePlayerFromGame(nickname: string) {
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

  function getPlayersOnCell(index: number): JourneyPlayer[] {
    if (!game) {
      return [];
    }

    return getJourneyVisiblePlayers(game).filter((player) => player.position === index);
  }

  function getCompactCellLabel(cell: JourneyMapCell | null): string {
    if (!cell) {
      return "·";
    }

    if (cell.isJackpot) {
      return "🏆";
    }

    return cell.prize > 0 ? `+${cell.prize}` : `${cell.prize}`;
  }

  function getCompactCellTone(cell: JourneyMapCell | null) {
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

  function shortenNickname(nickname: string): string {
    if (nickname.length <= 10) {
      return nickname;
    }

    return `${nickname.slice(0, 8)}…`;
  }

  function getHistoryEntrySummary(entry: JourneyTimelineEntry): string {
    if (entry.skipped) {
      return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${journeyTexts.timeline.skipSuffix}`;
    }

    const movement = `${entry.previousPosition} → ${entry.currentPosition}`;
    const prizePart =
      entry.prizeAfterMove > entry.previousPrize
        ? `+${entry.prizeAfterMove - entry.previousPrize}`
        : entry.prizeAfterMove < entry.previousPrize
          ? `${entry.prizeAfterMove - entry.previousPrize}`
          : "0";

    const cellPart = entry.cell?.isJackpot
      ? journeyTexts.timeline.treasure
      : entry.cell
        ? entry.cell.prize > 0
          ? `${journeyTexts.timeline.bonusPrefix} ${entry.cell.prize > 0 ? `+${entry.cell.prize}` : entry.cell.prize}`
          : `${journeyTexts.timeline.trapPrefix} ${entry.cell.prize}`
        : journeyTexts.timeline.empty;

    return `${journeyTexts.timeline.turnPrefix} ${entry.roundIndex}: ${movement}, ${cellPart}, ${journeyTexts.timeline.change} ${prizePart}, ${journeyTexts.timeline.total} ${entry.fullPrizeAfterRound}`;
  }

  function isCarefulProgressEntry(entry: JourneyTimelineEntry): boolean {
    if (entry.skipped || entry.currentPosition === journeyConfig.finishPosition || entry.moveType === "moveWithJackpot") {
      return false;
    }

    if (!entry.cell) {
      return true;
    }

    if (entry.cell.isJackpot) {
      return true;
    }

    return !entry.cell.prize;
  }

  function getAchievementProgress(player: JourneyPlayer, timeline: JourneyTimelineEntry[]) {
    const obtainedPrizes = [
      ...new Set(
        timeline
          .filter((entry) => !entry.skipped && entry.cell && !entry.cell.isJackpot && typeof entry.cell.prize === "number" && entry.cell.prize !== 0)
          .map((entry) => entry.cell.prize),
      ),
    ];
    const missingPrizes = nonJackpotPrizes.filter((prize) => !obtainedPrizes.includes(prize));

    return {
      collector: {
        achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.COLLECTOR.name),
        obtainedPrizes,
        missingPrizes,
      },
      unlucky: {
        achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.UNLUCKY.name),
        current: getCurrentStreak(timeline, isTrapProgressEntry),
        best: getBestStreak(timeline, isTrapProgressEntry),
        target: 3,
      },
      careful: {
        achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.CAREFUL.name),
        current: getCurrentStreak(timeline, isCarefulProgressEntry),
        best: getBestStreak(timeline, isCarefulProgressEntry),
        target: 3,
      },
      lucky: {
        achieved: player.bonuses.some((bonus) => bonus.name === journeyAchievements.LUCKY.name),
        current: getCurrentStreak(timeline, isLuckyProgressEntry),
        best: getBestStreak(timeline, isLuckyProgressEntry),
        target: 5,
      },
    };
  }

  const resultsCard = game && gameIsOver ? (
    <Card>
      <CardHeader title={journeyTexts.cards.resultsTitle} subheader={journeyTexts.cards.resultsSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          <Alert icon={<EmojiEventsRoundedIcon fontSize="inherit" />} severity="success">
            {journeyTexts.alerts.resultsCompletePrefix} {finishedPlayers.length} {journeyTexts.alerts.resultsCompleteSuffix}
          </Alert>
          <Stack spacing={1}>
            {results.map((player, index) => (
              <Box
                key={player.nickname}
                sx={{
                  p: 1.5,
                  borderRadius: (theme) => theme.customRadii.md,
                  backgroundColor: index === 0 ? "rgba(245, 158, 11, 0.14)" : "rgba(255,255,255,0.64)",
                }}
              >
                <Typography fontWeight={700}>
                  {index + 1}. {player.nickname}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {player.fullPrize} {journeyConfig.currency}
                </Typography>
              </Box>
            ))}
          </Stack>
          {receipts ? (
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                {journeyTexts.results.receiptsTitle}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(receipts).map(([amount, count]) => (
                  <AppChip key={amount} label={`${amount}: ${count}`} />
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
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.92)",
              boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Stack direction={{ xs: "column", xl: "row" }} spacing={3} justifyContent="space-between" alignItems={{ xl: "center" }}>
                <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: { xl: "60%" } }}>
                    <AppBreadcrumbs items={journeyTexts.breadcrumbs.split(" / ")} />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
                    <Typography
                      variant="h3"
                      sx={{
                        lineHeight: 1,
                        letterSpacing: "-0.04em",
                        fontSize: { xs: "2.1rem", md: "3rem" },
                      }}
                    >
                      {journeyTexts.pageTitle}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {pageStatusChips.map((chip) => (
                      <AppChip key={chip.label} label={chip.label} color={chip.color} />
                      ))}
                    </Stack>
                  </Stack>
                  <Typography variant="body1" color="text.secondary">
                    {journeyTexts.pageDescription}
                  </Typography>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", xl: "auto" } }}>
                  <AppPillButton variant="outlined" startIcon={<MenuBookRoundedIcon />} onClick={() => setRulesDialogOpen(true)}>
                    {journeyTexts.actions.rules}
                  </AppPillButton>
                  <AppPillButton variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={handleStartGame} disabled={Boolean(game) || !canStartGame}>
                    {journeyTexts.actions.newGame}
                  </AppPillButton>
                  <AppPillButton variant="outlined" startIcon={<RestoreRoundedIcon />} onClick={handleRestoreGame} disabled={!savedGameAvailable}>
                    {journeyTexts.actions.restore}
                  </AppPillButton>
                  <AppPillButton variant="text" color="inherit" startIcon={<AutorenewRoundedIcon />} onClick={handleRestartGame}>
                    {journeyTexts.actions.reset}
                  </AppPillButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{journeyTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              {resultsCard}

            {!game ? (
              <Card>
                <CardHeader title={journeyTexts.cards.playersTitle} subheader={journeyTexts.cards.playersSubtitle} />
                <CardContent>
                  <Stack spacing={2}>
                    {playerNames.map((playerName, index) => (
                      <Stack key={index} direction="row" spacing={1} alignItems="center">
                        <AppTextInput
                          fullWidth
                          label={`${journeyTexts.fields.playerPrefix} ${index + 1}`}
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
                      <AppPillButton variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleAddPlayerField}>
                        {journeyTexts.actions.addPlayer}
                      </AppPillButton>
                      <AppPillButton variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setPlayersImportOpen(true)}>
                        {journeyTexts.actions.importPlayers}
                      </AppPillButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader title={journeyTexts.cards.movesTitle} subheader={journeyTexts.cards.movesSubtitle} />
                <CardContent>
                  <Stack spacing={2}>
                    {activePlayers.length ? (
                      activePlayers.map((player) => (
                        <Stack
                          key={player.nickname}
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                          alignItems={{ md: "flex-start" }}
                          sx={{ p: 1.5, borderRadius: (theme) => theme.customRadii.md, backgroundColor: "rgba(255,255,255,0.6)" }}
                        >
                          <Box sx={{ minWidth: 160 }}>
                            <Typography fontWeight={700}>{player.nickname}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {journeyTexts.table.cell} {player.position} · {getJourneyPlayerFullPrize(player)} {journeyConfig.currency}
                            </Typography>
                          </Box>

                          <AppTextInput
                            type="number"
                            label={journeyTexts.fields.move}
                            size="small"
                            value={moveInputs[player.nickname] ?? ""}
                            onChange={(event) => handleMoveInputChange(player.nickname, event.target.value)}
                            disabled={Boolean(skippedPlayers[player.nickname])}
                            inputProps={{ min: journeyConfig.minDice, max: journeyConfig.maxDice }}
                            error={
                              Boolean(moveInputs[player.nickname]) &&
                              !isValidDiceValue(moveInputs[player.nickname], journeyConfig) &&
                              !skippedPlayers[player.nickname]
                            }
                          />

                          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                            <Typography variant="body2">{journeyTexts.fields.skip}</Typography>
                            <Switch checked={Boolean(skippedPlayers[player.nickname])} onChange={() => handleSkipToggle(player.nickname)} />
                            <Tooltip title={journeyTexts.tooltips.removePlayer}>
                              <IconButton color="error" onClick={() => handleRemovePlayerFromGame(player.nickname)}>
                                <DeleteOutlineRoundedIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      ))
                    ) : (
                      <Alert severity="success">{journeyTexts.alerts.allPlayersFinished}</Alert>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <AppPillButton variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setMovesImportOpen(true)}>
                        {journeyTexts.actions.importMoves}
                      </AppPillButton>
                      <AppPillButton variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={handleSubmitRound} disabled={!canSubmitRound}>
                        {journeyTexts.actions.applyMove}
                      </AppPillButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader title={journeyTexts.cards.logTitle} subheader={journeyTexts.cards.logSubtitle} />
              <CardContent>
                {game?.comments?.length ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: (theme) => theme.customRadii.surface,
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
                    {journeyTexts.alerts.logEmpty}
                  </Alert>
                )}
              </CardContent>
            </Card>

            </Stack>
          </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <Card>
              <CardHeader
                title={journeyTexts.cards.mapTitle}
                subheader={`${journeyTexts.cards.mapSubtitlePrefix} ${journeyConfig.mapSize} ${journeyTexts.cards.mapSubtitleSuffix}`}
              />
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  <AppChip size="small" label={journeyTexts.mapLegend.empty} variant="outlined" />
                  <AppChip size="small" label={journeyTexts.mapLegend.bonus} color="success" variant="outlined" />
                  <AppChip size="small" label={journeyTexts.mapLegend.trap} color="error" variant="outlined" />
                  <AppChip size="small" label={journeyTexts.mapLegend.treasure} color="warning" variant="outlined" />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(10, 72px)",
                    columnGap: { xs: 0.75, md: 1.25 },
                    rowGap: { xs: 0.75, md: 1.25 },
                    justifyContent: "space-between",
                    overflowX: "auto",
                  }}
                >
                  {Array.from({ length: journeyConfig.mapSize }, (_, index) => index + 1).map((cellIndex) => {
                    const cell = game ? getJourneyMapCell(cellIndex, game.map) : null;
                    const playersOnCell = getPlayersOnCell(cellIndex);
                    const tone = getCompactCellTone(cell);

                    return (
                      <Paper
                        key={cellIndex}
                        variant="outlined"
                        onMouseEnter={(event) =>
                          setHoveredCell({
                            anchorEl: event.currentTarget,
                            cellIndex,
                            cell,
                            playersOnCell,
                          })
                        }
                        onMouseLeave={() =>
                          setHoveredCell((current) => (current?.cellIndex === cellIndex ? null : current))
                        }
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: (theme) => theme.customRadii.control,
                          p: 0.5,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          borderColor: tone.borderColor,
                          backgroundColor: tone.backgroundColor,
                          color: tone.color,
                          cursor: "default",
                        }}
                      >
                        <Typography variant="caption" sx={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                          {cellIndex}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: "center", fontWeight: 700 }}>
                          {getCompactCellLabel(cell)}
                        </Typography>
                        <Stack direction="row" spacing={0.25} justifyContent="center" flexWrap="wrap" useFlexGap>
                          {playersOnCell.slice(0, 3).map((player) => (
                            <Avatar key={player.id} sx={{ width: 18, height: 18, fontSize: 10 }}>
                              {player.nickname.slice(0, 1).toUpperCase()}
                            </Avatar>
                          ))}
                          {playersOnCell.length > 3 ? <AppChip size="small" label={`+${playersOnCell.length - 3}`} /> : null}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>

                <Popper open={Boolean(hoveredCell?.anchorEl)} anchorEl={hoveredCell?.anchorEl} placement="top" transition>
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={120}>
                      <Paper sx={{ p: 2, width: 320, borderRadius: (theme) => theme.customRadii.md, boxShadow: 8 }}>
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700}>
                              {journeyTexts.hover.cellPrefix} {hoveredCell?.cellIndex}
                            </Typography>
                            <AppChip
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
                                ? `${journeyTexts.hover.jackpotFoundPrefix} ${hoveredCell.cell.winner.nickname}.`
                                : journeyTexts.hover.jackpotNotFound}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {hoveredCell?.cell
                                ? hoveredCell.cell.prize > 0
                                  ? `${journeyTexts.hover.bonusPrefix} ${hoveredCell.cell.prize} ${journeyConfig.currency}.`
                                  : `${journeyTexts.hover.trapPrefix} ${hoveredCell.cell.prize} ${journeyConfig.currency}.`
                                : journeyTexts.hover.cellEmpty}
                            </Typography>
                          )}

                          <Divider />

                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {journeyTexts.hover.playersOnCell}
                            </Typography>
                            {hoveredCell?.playersOnCell?.length ? (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                                {hoveredCell.playersOnCell.map((player) => (
                                  <AppChip key={player.id} size="small" color="primary" label={shortenNickname(player.nickname)} />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {journeyTexts.hover.noPlayersOnCell}
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
              <CardHeader title={journeyTexts.cards.stateTitle} subheader={journeyTexts.cards.stateSubtitle} />
              <CardContent>
                {game ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width={56}></TableCell>
                        <TableCell>{journeyTexts.table.player}</TableCell>
                        <TableCell align="right">{journeyTexts.table.cell}</TableCell>
                        <TableCell align="right">{journeyTexts.table.base}</TableCell>
                        <TableCell align="right">{journeyTexts.table.withBonuses}</TableCell>
                        <TableCell align="right">{journeyTexts.table.achievements}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {game.players.map((player) => {
                        const isExpanded = expandedPlayerId === player.id;
                        const timeline = playerTimelines[player.id] ?? [];
                        const achievementProgress = getAchievementProgress(player, timeline);

                        return (
                          <Fragment key={player.id}>
                            <TableRow>
                              <TableCell>
                                <IconButton size="small" onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}>
                                  {isExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography fontWeight={600}>{player.nickname}</Typography>
                                  {player.bonuses.some((bonus) => bonus.name === journeyAchievements.JACKPOT.name) ? (
                                    <AppChip size="small" color="warning" label={journeyTexts.table.treasure} />
                                  ) : null}
                                  {player.status === "removed" ? <AppChip size="small" color="default" label={journeyTexts.table.removed} /> : null}
                                  {player.status === "finished" ? <AppChip size="small" color="success" label={journeyTexts.table.finish} /> : null}
                                </Stack>
                              </TableCell>
                              <TableCell align="right">{player.position}</TableCell>
                              <TableCell align="right">{player.prize}</TableCell>
                              <TableCell align="right">{getJourneyPlayerFullPrize(player)}</TableCell>
                              <TableCell align="right">
                                {Math.max(player.bonuses.length - Number(player.bonuses.some((bonus) => bonus.name === journeyAchievements.JACKPOT.name)), 0)}
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell colSpan={6} sx={{ py: 0, borderBottom: isExpanded ? undefined : 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ px: 2, py: 1.5, backgroundColor: "rgba(15, 23, 42, 0.03)" }}>
                                    <Stack spacing={2}>
                                      <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                          {journeyTexts.progress.title}
                                        </Typography>

                                        <Stack spacing={1}>
                                          <Box
                                            sx={{
                                              p: 1.25,
                                              borderRadius: (theme) => theme.customRadii.sm,
                                              backgroundColor: "#fff",
                                              border: "1px solid rgba(15, 23, 42, 0.08)",
                                            }}
                                          >
                                            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                              <Typography variant="body2" fontWeight={700}>
                                                {journeyAchievements.COLLECTOR.title}
                                              </Typography>
                                              <AppChip
                                                size="small"
                                                color={achievementProgress.collector.achieved ? "success" : "default"}
                                                label={
                                                  achievementProgress.collector.achieved
                                                    ? journeyTexts.progress.obtained
                                                    : `${achievementProgress.collector.obtainedPrizes.length} ${journeyTexts.progress.of} ${nonJackpotPrizes.length}`
                                                }
                                              />
                                            </Stack>

                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                              {journeyTexts.progress.obtained}:
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                              {achievementProgress.collector.obtainedPrizes.length ? (
                                                achievementProgress.collector.obtainedPrizes.map((prize) => (
                                                  <AppChip key={`${player.id}-obtained-${prize}`} size="small" color="success" label={getPrizeBadgeLabel(prize)} />
                                                ))
                                              ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                  {journeyTexts.progress.nothingYet}
                                                </Typography>
                                              )}
                                            </Stack>

                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                              {journeyTexts.progress.missing}:
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                              {achievementProgress.collector.missingPrizes.length ? (
                                                achievementProgress.collector.missingPrizes.map((prize) => (
                                                  <AppChip key={`${player.id}-missing-${prize}`} size="small" variant="outlined" label={getPrizeBadgeLabel(prize)} />
                                                ))
                                              ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                  {journeyTexts.progress.allCollected}
                                                </Typography>
                                              )}
                                            </Stack>
                                          </Box>

                                          {[
                                            { key: "unlucky", meta: journeyAchievements.UNLUCKY, data: achievementProgress.unlucky },
                                            { key: "careful", meta: journeyAchievements.CAREFUL, data: achievementProgress.careful },
                                            { key: "lucky", meta: journeyAchievements.LUCKY, data: achievementProgress.lucky },
                                          ].map(({ key, meta, data }) => (
                                            <Box
                                              key={`${player.id}-${key}`}
                                              sx={{
                                                p: 1.25,
                                                borderRadius: (theme) => theme.customRadii.sm,
                                                backgroundColor: "#fff",
                                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                              }}
                                            >
                                              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                                <Typography variant="body2" fontWeight={700}>
                                                  {meta.title}
                                                </Typography>
                                                <AppChip
                                                  size="small"
                                                  color={data.achieved ? "success" : "default"}
                                                  label={data.achieved ? journeyTexts.progress.obtained : journeyTexts.progress.inProgress}
                                                />
                                              </Stack>
                                              <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                                                <Typography variant="body2">
                                                  {journeyTexts.progress.currentSeries}: {data.current} {journeyTexts.progress.of} {data.target}
                                                </Typography>
                                                <Typography variant="body2">
                                                  {journeyTexts.progress.maximum}: {data.best} {journeyTexts.progress.of} {data.target}
                                                </Typography>
                                              </Stack>
                                            </Box>
                                          ))}
                                        </Stack>
                                      </Box>

                                      <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                          {journeyTexts.progress.historyTitle}
                                        </Typography>
                                        {timeline.length ? (
                                          <Stack spacing={0.75}>
                                            {[...timeline].reverse().map((entry, index) => (
                                              <Box
                                                key={`${player.id}-${entry.createdAt}-${index}`}
                                                sx={{
                                                  p: 1,
                                                  borderRadius: (theme) => theme.customRadii.sm,
                                                  backgroundColor: "#fff",
                                                  border: "1px solid rgba(15, 23, 42, 0.08)",
                                                }}
                                              >
                                                <Typography variant="body2">{getHistoryEntrySummary(entry)}</Typography>
                                                {entry.achievementsAwarded?.length ? (
                                                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                                                    {entry.achievementsAwarded.map((achievement) => (
                                                      <AppChip key={`${player.id}-${achievement.name}-${index}`} size="small" color="secondary" label={achievement.title} />
                                                    ))}
                                                  </Stack>
                                                ) : null}
                                              </Box>
                                            ))}
                                          </Stack>
                                        ) : (
                                          <Typography variant="body2" color="text.secondary">
                                            {journeyTexts.progress.historyEmpty}
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
                  <Alert severity="info">{journeyTexts.alerts.createOrRestoreGame}</Alert>
                )}
              </CardContent>
            </Card>

          </Stack>
        </Grid>
      </Grid>

      <Dialog open={rulesDialogOpen} onClose={() => setRulesDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{journeyTexts.rulesDialogTitle}</DialogTitle>
        <DialogContent dividers>
          <JourneyRulesSummary journeyConfig={journeyConfig} journeyAchievements={journeyAchievements} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppPillButton color="inherit" onClick={() => setRulesDialogOpen(false)}>
            {journeyTexts.actions.close}
          </AppPillButton>
        </DialogActions>
      </Dialog>

      <Dialog open={playersImportOpen} onClose={() => setPlayersImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{journeyTexts.dialogTitles.playersImport}</DialogTitle>
        <DialogContent>
          <AppTextInput
            autoFocus
            fullWidth
            label={journeyTexts.fields.forumText}
            multiline
            minRows={10}
            value={playersImportText}
            onChange={(event) => setPlayersImportText(event.target.value)}
            helperText={journeyTexts.helperText.playersImport}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppPillButton color="inherit" onClick={() => setPlayersImportOpen(false)}>
            {journeyTexts.actions.cancel}
          </AppPillButton>
          <AppPillButton
            variant="contained"
            onClick={() => {
              handleImportPlayers();
              setPlayersImportOpen(false);
            }}
          >
            {journeyTexts.actions.apply}
          </AppPillButton>
        </DialogActions>
      </Dialog>

      <Dialog open={movesImportOpen} onClose={() => setMovesImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{journeyTexts.dialogTitles.movesImport}</DialogTitle>
        <DialogContent>
          <AppTextInput
            autoFocus
            fullWidth
            label={journeyTexts.fields.forumText}
            multiline
            minRows={8}
            value={movesImportText}
            onChange={(event) => setMovesImportText(event.target.value)}
            helperText={journeyTexts.helperText.movesImport}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppPillButton color="inherit" onClick={() => setMovesImportOpen(false)}>
            {journeyTexts.actions.cancel}
          </AppPillButton>
          <AppPillButton
            variant="contained"
            onClick={() => {
              handleImportMoves();
              setMovesImportOpen(false);
            }}
          >
            {journeyTexts.actions.apply}
          </AppPillButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
