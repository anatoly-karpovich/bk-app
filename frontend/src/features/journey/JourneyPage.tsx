import { useEffect, useMemo, useState } from "react";
import { Alert, Grid, Stack } from "@mui/material";
import {
  calculateReceiptsDistribution,
  getJourneyActivePlayers,
  getJourneyFinishedPlayers,
  getJourneyPlayerTimeline,
  getJourneyResults,
  isJourneyGameOver,
} from "./engine";
import { getJourneyAchievements, getJourneyConfig, getNonJackpotPrizes } from "./config";
import { clearJourneyGame, hasStoredJourneyGame, loadJourneyGameId, saveJourneyGameId } from "./storage";
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
import {
  createJourneyGameRequest,
  getJourneyGameByIdRequest,
  parseJourneyMovesRequest,
  parseJourneyPlayersRequest,
  removeJourneyPlayerRequest,
  submitJourneyRoundRequest,
} from "./api/journey.client";
import type {
  JourneyMoveInputs,
  JourneyPersistedGame,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Journey request failed";
}

export default function JourneyPage({ djName, defaultRuleset }: JourneyPageProps) {
  const [game, setGame] = useState<JourneyPersistedGame | null>(null);
  const [playerNames, setPlayerNames] = useState([""]);
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [moveInputs, setMoveInputs] = useState<JourneyMoveInputs>({});
  const [skippedPlayers, setSkippedPlayers] = useState<JourneySkippedPlayers>({});
  const [savedGameAvailable, setSavedGameAvailable] = useState(hasStoredJourneyGame());
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [isImportingPlayers, setIsImportingPlayers] = useState(false);
  const [isImportingMoves, setIsImportingMoves] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!game?.id) {
      return;
    }

    saveJourneyGameId(game.id);
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
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isResettingGame ||
      isSubmittingRound ||
      isImportingPlayers ||
      isImportingMoves ||
      Boolean(removingPlayerId),
    [
      isImportingMoves,
      isImportingPlayers,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
      isSubmittingRound,
      removingPlayerId,
    ],
  );
  const setupActionsDisabled = useMemo(
    () => isStartingGame || isImportingPlayers || isRestoringGame || isResettingGame,
    [isImportingPlayers, isResettingGame, isRestoringGame, isStartingGame],
  );
  const roundActionsDisabled = useMemo(
    () => isSubmittingRound || isImportingMoves || isResettingGame || isRestoringGame || Boolean(removingPlayerId),
    [isImportingMoves, isResettingGame, isRestoringGame, isSubmittingRound, removingPlayerId],
  );

  const canSubmitRound = useMemo(() => {
    if (!activePlayers.length) {
      return false;
    }

    const activeMovePlayers = activePlayers.filter((player) => !skippedPlayers[player.id]);
    if (!activeMovePlayers.length) {
      return false;
    }

    return activeMovePlayers.every((player) => isValidDiceValue(moveInputs[player.id], journeyConfig));
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

  function resetJourneyPageState() {
    clearJourneyGame();
    setSavedGameAvailable(false);
    setGame(null);
    setPlayerNames([""]);
    setPlayersImportText("");
    resetRoundUi([]);
  }

  async function handleRestoreGame() {
    const storedGameId = loadJourneyGameId();

    if (!storedGameId) {
      setSavedGameAvailable(false);
      return;
    }

    setRequestError(null);
    setIsRestoringGame(true);

    try {
      const restoredGame = await getJourneyGameByIdRequest(storedGameId);
      setGame(restoredGame);
      resetRoundUi(getJourneyActivePlayers(restoredGame));
      setSavedGameAvailable(true);
    } catch (error) {
      clearJourneyGame();
      setSavedGameAvailable(false);
      setRequestError(getErrorMessage(error));
    } finally {
      setIsRestoringGame(false);
    }
  }

  async function handleStartGame() {
    const cleanNames = playerNames.map((name) => name.trim()).filter(Boolean);
    if (!cleanNames.length) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createJourneyGameRequest({
        nicknames: cleanNames,
        rules: defaultRuleset.rules,
        rulesetId: defaultRuleset.id,
        rulesetName: defaultRuleset.name,
      });

      setGame(nextGame);
      resetRoundUi(getJourneyActivePlayers(nextGame));
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsStartingGame(false);
    }
  }

  function handleRestartGame() {
    setRequestError(null);
    setIsResettingGame(true);
    resetJourneyPageState();
    setIsResettingGame(false);
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

  async function handleImportPlayers() {
    if (!playersImportText.trim()) {
      return false;
    }

    setRequestError(null);
    setIsImportingPlayers(true);

    try {
      const importedNames = await parseJourneyPlayersRequest(playersImportText, djName);

      if (!importedNames.length) {
        return false;
      }

      setPlayerNames((current) => {
        const merged = [...current.map((name) => name.trim()).filter(Boolean), ...importedNames];
        return [...new Set(merged)];
      });

      return true;
    } catch (error) {
      setRequestError(getErrorMessage(error));
      return false;
    } finally {
      setIsImportingPlayers(false);
    }
  }

  function handleMoveInputChange(playerId: string, value: string) {
    setMoveInputs((current) => ({
      ...current,
      [playerId]: value,
    }));
  }

  function handleSkipToggle(playerId: string) {
    setSkippedPlayers((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  }

  async function handleImportMoves() {
    if (!movesImportText.trim()) {
      return false;
    }

    setRequestError(null);
    setIsImportingMoves(true);

    try {
      const parsedMoves = await parseJourneyMovesRequest(movesImportText);

      if (!Object.keys(parsedMoves).length) {
        return false;
      }

      const activePlayersByNickname = activePlayers.reduce<Record<string, JourneyPlayer>>((accumulator, player) => {
        accumulator[player.nickname.trim().toLowerCase()] = player;
        return accumulator;
      }, {});

      const mappedMoves = Object.entries(parsedMoves).reduce<Record<string, string>>((accumulator, [nickname, dice]) => {
        const player = activePlayersByNickname[nickname.trim().toLowerCase()];

        if (player) {
          accumulator[player.id] = String(dice);
        }

        return accumulator;
      }, {});

      if (!Object.keys(mappedMoves).length) {
        return false;
      }

      setMoveInputs((current) => ({
        ...current,
        ...mappedMoves,
      }));

      return true;
    } catch (error) {
      setRequestError(getErrorMessage(error));
      return false;
    } finally {
      setIsImportingMoves(false);
    }
  }

  async function handleSubmitRound() {
    if (!game?.id) {
      return;
    }

    const moves = activePlayers
      .filter((player) => !skippedPlayers[player.id])
      .map((player) => ({
        playerId: player.id,
        dice: Number(moveInputs[player.id]),
      }));

    const skippedPlayerIds = activePlayers.filter((player) => skippedPlayers[player.id]).map((player) => player.id);
    setRequestError(null);
    setIsSubmittingRound(true);

    try {
      const nextGame = await submitJourneyRoundRequest(game.id, {
        moves,
        skippedPlayerIds,
      });

      setGame(nextGame);
      resetRoundUi(getJourneyActivePlayers(nextGame));
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsSubmittingRound(false);
    }
  }

  async function handleRemovePlayerFromGame(playerId: string) {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setRemovingPlayerId(playerId);

    try {
      const nextGame = await removeJourneyPlayerRequest(game.id, playerId);
      setGame(nextGame);

      setMoveInputs((current) => {
        const nextInputs = { ...current };
        delete nextInputs[playerId];
        return nextInputs;
      });

      setSkippedPlayers((current) => {
        const nextSkipped = { ...current };
        delete nextSkipped[playerId];
        return nextSkipped;
      });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setRemovingPlayerId(null);
    }
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
            isStartingGame={isStartingGame}
            isRestoringGame={isRestoringGame}
            isResettingGame={isResettingGame}
            actionsDisabled={headerActionsDisabled}
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

        {requestError ? (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setRequestError(null)}>
              {requestError}
            </Alert>
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
                actionsDisabled={roundActionsDisabled}
                isImportingMoves={isImportingMoves}
                isSubmittingRound={isSubmittingRound}
                removingPlayerId={removingPlayerId}
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
                actionsDisabled={setupActionsDisabled}
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
        loading={isImportingPlayers}
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
        loading={isImportingMoves}
      />
    </>
  );
}
