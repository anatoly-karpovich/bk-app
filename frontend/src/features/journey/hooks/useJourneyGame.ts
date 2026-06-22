import { useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../../configs/types";
import {
  createJourneyGameRequest,
  deleteJourneyGameRequest,
  getJourneyGameByIdRequest,
  listJourneyGamesRequest,
  parseJourneyMovesRequest,
  parseJourneyPlayersRequest,
  removeJourneyPlayerRequest,
  submitJourneyRoundRequest,
} from "../api/journey.client";
import { DEFAULT_JOURNEY_RULES, getJourneyAchievements, getJourneyConfig, getNonJackpotPrizes } from "../config";
import {
  calculateReceiptsDistribution,
  createEmptyMoveState,
  createEmptySkipState,
  getJourneyActivePlayers,
  getJourneyFinishedPlayers,
  getPlayerNameErrors,
  getJourneyPlayerTimelines,
  getJourneyResults,
  getJourneyVisiblePlayers,
  isValidDiceValue,
  isJourneyGameOver,
} from "../journey-page.helpers";
import { mapParsedMovesToPlayerInputs } from "../mappers/journey.mapper";
import { clearJourneyGame, loadJourneyGameId, saveJourneyGameId } from "../storage";
import type {
  JourneyMoveInputs,
  JourneyPersistedGame,
  JourneyPlayer,
  JourneyPlayerReadModel,
  JourneyReceiptsDistribution,
  JourneySavedGameSummary,
  JourneySkippedPlayers,
  JourneyStatusChip,
  JourneyTimelineEntry,
} from "../types";
import { journeyTexts } from "../../../texts/journeyTexts";

interface UseJourneyGameParams {
  djName: string;
  selectedConfig: AppConfig | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Journey request failed";
}

export function useJourneyGame({ djName, selectedConfig }: UseJourneyGameParams) {
  const [game, setGame] = useState<JourneyPersistedGame | null>(null);
  const [storedGameId, setStoredGameId] = useState<string | null>(loadJourneyGameId());
  const [playerNames, setPlayerNames] = useState([""]);
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [moveInputs, setMoveInputs] = useState<JourneyMoveInputs>({});
  const [skippedPlayers, setSkippedPlayers] = useState<JourneySkippedPlayers>({});
  const [savedGames, setSavedGames] = useState<JourneySavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [deletingSavedGame, setDeletingSavedGame] = useState<JourneySavedGameSummary | null>(null);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
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
    setStoredGameId(game.id);
  }, [game]);

  const playerNameErrors = useMemo(() => getPlayerNameErrors(playerNames), [playerNames]);
  const selectedJourneyRules = selectedConfig?.games.journey ?? null;
  const journeyRules = useMemo(() => game?.rules ?? selectedJourneyRules ?? DEFAULT_JOURNEY_RULES, [game, selectedJourneyRules]);
  const journeyConfig = useMemo(() => game?.derived?.journeyConfig ?? getJourneyConfig(journeyRules), [game, journeyRules]);
  const journeyAchievements = useMemo(
    () => game?.derived?.journeyAchievements ?? getJourneyAchievements(journeyRules),
    [game, journeyRules],
  );
  const nonJackpotPrizes = useMemo(
    () => game?.derived?.nonJackpotPrizes ?? getNonJackpotPrizes(journeyRules),
    [game, journeyRules],
  );
  const canStartGame = Boolean(selectedJourneyRules) && playerNames.length > 0 && playerNameErrors.every((error) => !error);

  const activePlayers = useMemo<JourneyPlayerReadModel[]>(() => getJourneyActivePlayers(game), [game]);
  const finishedPlayers = useMemo<JourneyPlayerReadModel[]>(() => getJourneyFinishedPlayers(game), [game]);
  const results = useMemo<JourneyPlayerReadModel[]>(() => getJourneyResults(game), [game]);
  const receipts = useMemo<JourneyReceiptsDistribution | null>(() => calculateReceiptsDistribution(game), [game]);
  const gameIsOver = isJourneyGameOver(game);
  const activeGame = Boolean(game && !gameIsOver);
  const totalGamePlayers = useMemo(() => getJourneyVisiblePlayers(game).length, [game]);
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isLoadingSavedGames ||
      isDeletingSavedGame ||
      isResettingGame ||
      isSubmittingRound ||
      isImportingPlayers ||
      isImportingMoves ||
      Boolean(removingPlayerId),
    [
      isImportingMoves,
      isImportingPlayers,
      isLoadingSavedGames,
      isDeletingSavedGame,
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

  const playerTimelines = useMemo<Record<string, JourneyTimelineEntry[]>>(() => getJourneyPlayerTimelines(game), [game]);

  const pageStatusChips = useMemo<JourneyStatusChip[]>(() => {
    const rulesetLabel: JourneyStatusChip = {
      label: `${journeyTexts.statuses.rulesetPrefix} ${game ? game.configName : selectedConfig?.name ?? "Не выбран"}`,
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
  }, [activeGame, game, gameIsOver, selectedConfig?.name, totalGamePlayers]);

  function resetRoundUi(players: JourneyPlayer[] = []) {
    setMoveInputs(createEmptyMoveState(players));
    setSkippedPlayers(createEmptySkipState(players));
    setMovesImportText("");
  }

  function resetJourneyPageState() {
    clearJourneyGame();
    setStoredGameId(null);
    setGame(null);
    setPlayerNames([""]);
    setPlayersImportText("");
    resetRoundUi([]);
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const nextSavedGames = await listJourneyGamesRequest();
      setSavedGames(nextSavedGames);
      return nextSavedGames;
    } catch (error) {
      setSavedGames([]);
      setSavedGamesError(getErrorMessage(error));
      return [];
    } finally {
      setIsLoadingSavedGames(false);
    }
  }

  async function openSavedGamesDialog() {
    setSavedGamesDialogOpen(true);
    await loadSavedGames();
  }

  async function restoreSavedGame(gameId: string) {
    if (!gameId) {
      return;
    }

    setSavedGamesError(null);
    setIsRestoringGame(true);

    try {
      const restoredGame = await getJourneyGameByIdRequest(gameId);
      setGame(restoredGame);
      resetRoundUi(getJourneyActivePlayers(restoredGame));
      setSavedGamesDialogOpen(false);
      setStoredGameId(restoredGame.id);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsRestoringGame(false);
    }
  }

  function requestDeleteSavedGame(gameToDelete: JourneySavedGameSummary) {
    setDeletingSavedGame(gameToDelete);
  }

  function cancelDeleteSavedGame() {
    if (isDeletingSavedGame) {
      return;
    }

    setDeletingSavedGame(null);
  }

  async function confirmDeleteSavedGame() {
    if (!deletingSavedGame) {
      return;
    }

    setSavedGamesError(null);
    setIsDeletingSavedGame(true);

    try {
      await deleteJourneyGameRequest(deletingSavedGame.id);
      setSavedGames((current) => current.filter((gameItem) => gameItem.id !== deletingSavedGame.id));

      if (storedGameId === deletingSavedGame.id) {
        clearJourneyGame();
        setStoredGameId(null);
      }

      if (game?.id === deletingSavedGame.id) {
        resetJourneyPageState();
      }

      setDeletingSavedGame(null);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsDeletingSavedGame(false);
    }
  }

  async function startGame() {
    const cleanNames = playerNames.map((name) => name.trim()).filter(Boolean);
    if (!cleanNames.length || !selectedConfig?.id || !selectedJourneyRules) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createJourneyGameRequest({
        nicknames: cleanNames,
        configId: selectedConfig.id,
      });

      setGame(nextGame);
      resetRoundUi(getJourneyActivePlayers(nextGame));
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsStartingGame(false);
    }
  }

  function restartGame() {
    setRequestError(null);
    setIsResettingGame(true);
    resetJourneyPageState();
    setIsResettingGame(false);
  }

  function addPlayerField() {
    setPlayerNames((current) => [...current, ""]);
  }

  function changePlayerName(index: number, value: string) {
    setPlayerNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function removePlayerField(index: number) {
    setPlayerNames((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter((_, nameIndex) => nameIndex !== index);
    });
  }

  async function importPlayers() {
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

  function changeMoveInput(playerId: string, value: string) {
    setMoveInputs((current) => ({
      ...current,
      [playerId]: value,
    }));
  }

  function toggleSkip(playerId: string) {
    setSkippedPlayers((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  }

  async function importMoves() {
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

      const mappedMoves = mapParsedMovesToPlayerInputs(parsedMoves, activePlayers);

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

  async function submitRound() {
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

  async function removePlayerFromGame(playerId: string) {
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

  return {
    game,
    playerNames,
    playerNameErrors,
    playersImportText,
    movesImportText,
    moveInputs,
    skippedPlayers,
    savedGames,
    storedGameId,
    deletingSavedGame,
    savedGamesDialogOpen,
    savedGamesError,
    playersImportOpen,
    movesImportOpen,
    rulesDialogOpen,
    requestError,
    selectedJourneyRules,
    journeyConfig,
    journeyAchievements,
    nonJackpotPrizes,
    canStartGame,
    activePlayers,
    finishedPlayers,
    results,
    receipts,
    gameIsOver,
    headerActionsDisabled,
    setupActionsDisabled,
    roundActionsDisabled,
    canSubmitRound,
    playerTimelines,
    pageStatusChips,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isDeletingSavedGame,
      isResettingGame,
      isSubmittingRound,
      isImportingPlayers,
      isImportingMoves,
      removingPlayerId,
    },
    actions: {
      setSavedGamesDialogOpen,
      setPlayersImportOpen,
      setMovesImportOpen,
      setRulesDialogOpen,
      setPlayersImportText,
      setMovesImportText,
      setRequestError,
      openSavedGamesDialog,
      restoreSavedGame,
      requestDeleteSavedGame,
      cancelDeleteSavedGame,
      confirmDeleteSavedGame,
      startGame,
      restartGame,
      addPlayerField,
      changePlayerName,
      removePlayerField,
      importPlayers,
      changeMoveInput,
      toggleSkip,
      importMoves,
      submitRound,
      removePlayerFromGame,
    },
  };
}
