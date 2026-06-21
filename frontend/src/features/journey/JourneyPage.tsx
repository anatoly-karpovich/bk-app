import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, Stack } from "@mui/material";
import {
  calculateReceiptsDistribution,
  createJourneyGame,
  getJourneyActivePlayers,
  getJourneyFinishedPlayers,
  getJourneyPlayerTimeline,
  getJourneyResults,
  isJourneyGameOver,
  makeJourneyRound,
  removeJourneyPlayer,
} from "./engine";
import { getJourneyAchievements, getJourneyConfig, getNonJackpotPrizes } from "./config";
import { parseMovesFromForum, parsePlayerNamesFromForum } from "./parsers";
import { clearJourneyGame, hasStoredJourneyGame, loadJourneyGame, saveJourneyGame } from "./storage";
import {
  createEmptyMoveState,
  createEmptySkipState,
  getPlayerNameErrors,
  isValidDiceValue,
} from "./journey-page.helpers";
import { journeyTexts } from "../../texts/journeyTexts";
import JourneyImportDialog from "./components/JourneyImportDialog";
import JourneyLogCard from "./components/JourneyLogCard";
import JourneyMapCard from "./components/JourneyMapCard";
import JourneyPageHeader from "./components/JourneyPageHeader";
import JourneyPlayersSetupCard from "./components/JourneyPlayersSetupCard";
import JourneyResultsCard from "./components/JourneyResultsCard";
import JourneyRoundControlsCard from "./components/JourneyRoundControlsCard";
import JourneyRulesDialog from "./components/JourneyRulesDialog";
import JourneyStateCard from "./components/JourneyStateCard";
import type {
  JourneyGame,
  JourneyMoveInputs,
  JourneyPlayer,
  JourneyReceiptsDistribution,
  JourneyRuleset,
  JourneySkippedPlayers,
  JourneyStatusChip,
  JourneyTimelineEntry,
} from "./types";

interface JourneyPageProps {
  djName: string;
  defaultRuleset: JourneyRuleset;
}

export default function JourneyPage({ djName, defaultRuleset }: JourneyPageProps) {
  const [game, setGame] = useState<JourneyGame | null>(null);
  const [playerNames, setPlayerNames] = useState([""]);
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [moveInputs, setMoveInputs] = useState<JourneyMoveInputs>({});
  const [skippedPlayers, setSkippedPlayers] = useState<JourneySkippedPlayers>({});
  const [savedGameAvailable, setSavedGameAvailable] = useState(hasStoredJourneyGame());
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);

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

    return game.players.reduce<Record<string, JourneyTimelineEntry[]>>((accumulator, player) => {
      accumulator[player.id] = getJourneyPlayerTimeline(game, player.id).map((entry) => ({
        ...entry,
        roundIndex:
          game.rounds.find((round) =>
            (round.entries ?? []).some((roundEntry) => roundEntry.playerId === entry.playerId && roundEntry.createdAt === entry.createdAt),
           )?.moveIndex ?? "-",
      }));

      return accumulator;
    }, {});
  }, [game]);

  const pageStatusChips = useMemo<JourneyStatusChip[]>(() => {
    const rulesetLabel: JourneyStatusChip = {
      label: `${journeyTexts.statuses.rulesetPrefix} ${game ? game.rulesetName : defaultRuleset.name}`,
      color: "secondary",
    };

    if (!game) {
      return [{ label: journeyTexts.statuses.notStarted, color: "default" }, rulesetLabel];
    }

    const chips: JourneyStatusChip[] = [
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

  function resetRoundUi(players: JourneyPlayer[] = []) {
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

  function handlePlayerNameChange(index: number, value: string) {
    setPlayerNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function handleRemovePlayerField(index: number) {
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
    const nextGame = makeJourneyRound(game!, moves, skippedNicknames);

    setGame(nextGame);
    resetRoundUi(getJourneyActivePlayers(nextGame));
  }

  function handleRemovePlayerFromGame(nickname: string) {
    const nextGame = removeJourneyPlayer(game!, nickname);
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

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <JourneyPageHeader
            pageStatusChips={pageStatusChips}
            canStartGame={canStartGame}
            hasGame={Boolean(game)}
            savedGameAvailable={savedGameAvailable}
            onOpenRules={() => setRulesDialogOpen(true)}
            onStartGame={handleStartGame}
            onRestoreGame={handleRestoreGame}
            onRestartGame={handleRestartGame}
          />
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{journeyTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <JourneyResultsCard
              gameIsOver={gameIsOver}
              finishedPlayers={finishedPlayers}
              results={results}
              receipts={receipts}
              currency={journeyConfig.currency}
            />

            {game ? (
              <JourneyRoundControlsCard
                activePlayers={activePlayers}
                moveInputs={moveInputs}
                skippedPlayers={skippedPlayers}
                journeyConfig={journeyConfig}
                canSubmitRound={canSubmitRound}
                onMoveInputChange={handleMoveInputChange}
                onSkipToggle={handleSkipToggle}
                onRemovePlayer={handleRemovePlayerFromGame}
                onOpenImport={() => setMovesImportOpen(true)}
                onSubmitRound={handleSubmitRound}
              />
            ) : (
              <JourneyPlayersSetupCard
                playerNames={playerNames}
                playerNameErrors={playerNameErrors}
                onPlayerNameChange={handlePlayerNameChange}
                onRemovePlayerField={handleRemovePlayerField}
                onAddPlayerField={handleAddPlayerField}
                onOpenImport={() => setPlayersImportOpen(true)}
              />
            )}

            <JourneyLogCard comments={game?.comments} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <JourneyMapCard game={game} journeyConfig={journeyConfig} />
            <JourneyStateCard
              game={game}
              playerTimelines={playerTimelines}
              journeyAchievements={journeyAchievements}
              nonJackpotPrizes={nonJackpotPrizes}
              finishPosition={journeyConfig.finishPosition}
            />
          </Stack>
        </Grid>
      </Grid>

      <JourneyRulesDialog
        open={rulesDialogOpen}
        onClose={() => setRulesDialogOpen(false)}
        journeyConfig={journeyConfig}
        journeyAchievements={journeyAchievements}
      />

      <JourneyImportDialog
        open={playersImportOpen}
        onClose={() => setPlayersImportOpen(false)}
        onApply={handleImportPlayers}
        title={journeyTexts.dialogTitles.playersImport}
        value={playersImportText}
        onChange={setPlayersImportText}
        helperText={journeyTexts.helperText.playersImport}
        minRows={10}
      />

      <JourneyImportDialog
        open={movesImportOpen}
        onClose={() => setMovesImportOpen(false)}
        onApply={handleImportMoves}
        title={journeyTexts.dialogTitles.movesImport}
        value={movesImportText}
        onChange={setMovesImportText}
        helperText={journeyTexts.helperText.movesImport}
        minRows={8}
      />
    </>
  );
}

