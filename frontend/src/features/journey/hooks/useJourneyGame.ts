import { useEffect, useMemo, useState } from "react";
import {
  getJourneyGameConfigsRequest,
  getSelectedGameConfigStorageKey,
} from "../../projects/api/projects.client";
import { loadSelectedGameConfigId, saveSelectedGameConfigId } from "../../projects/storage";
import type { JourneyGameConfig, Project } from "../../projects/types";
import {
  createJourneyGameRequest,
  deleteJourneyGameRequest,
  getJourneyForumStateRequest,
  getJourneyGameByIdRequest,
  listJourneyGamesRequest,
  parseJourneyMovesRequest,
  parseJourneyPlayersRequest,
  removeJourneyPlayerRequest,
  submitJourneyRoundRequest,
} from "../api/journey.client";
import { DEFAULT_JOURNEY_RULES, getJourneyAchievements, getJourneyConfig } from "../config";
import {
  createEmptyMoveState,
  createEmptySkipState,
  getJourneyActivePlayers,
  getJourneyFinishedPlayers,
  getJourneyPlayerTimelines,
  getJourneyResults,
  getJourneyVisiblePlayers,
  getPlayerNameErrors,
  isJourneyGameOver,
  isValidDiceValue,
} from "../journey-page.helpers";
import { mapParsedMovesToPlayerInputs } from "../mappers/journey.mapper";
import { clearJourneyGame, loadJourneyGameId, saveJourneyGameId } from "../storage";
import type {
  JourneyMoveInputs,
  JourneyPageGame,
  JourneyPlayerReadModel,
  JourneySavedGameSummary,
  JourneySkippedPlayers,
  JourneyStatusChip,
  JourneyTimelineEntry,
} from "../types";
import { journeyTexts } from "../../../texts/journeyTexts";

interface UseJourneyGameParams {
  djName: string;
  selectedProject: Project | null;
}

const JOURNEY_GAME_CONFIG_STORAGE_KEY = getSelectedGameConfigStorageKey("journey");
const SAVED_GAME_PROJECT_MISMATCH_ERROR = "Saved game belongs to another project.";
const NO_PRESET_SELECTED_LABEL = "No preset selected";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Journey request failed";
}

function resolveSelectedGameConfigId(gameConfigs: JourneyGameConfig[]) {
  const storedGameConfigId = loadSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY);
  const fallbackGameConfigId = gameConfigs[0]?.id ?? "";

  return (
    (storedGameConfigId && gameConfigs.some((gameConfig) => gameConfig.id === storedGameConfigId) && storedGameConfigId) ||
    fallbackGameConfigId
  );
}

export function useJourneyGame({ djName, selectedProject }: UseJourneyGameParams) {
  const [game, setGame] = useState<JourneyPageGame | null>(null);
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
  const [gameConfigsError, setGameConfigsError] = useState<string | null>(null);
  const [gameConfigs, setGameConfigs] = useState<JourneyGameConfig[]>([]);
  const [selectedGameConfigId, setSelectedGameConfigId] = useState(() => loadSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY) ?? "");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isLoadingGameConfigs, setIsLoadingGameConfigs] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [isImportingPlayers, setIsImportingPlayers] = useState(false);
  const [isImportingMoves, setIsImportingMoves] = useState(false);
  const [isAddingForumState, setIsAddingForumState] = useState(false);
  const [forumStateLogEntries, setForumStateLogEntries] = useState<string[]>([]);
  const [deletingSavedGame, setDeletingSavedGame] = useState<JourneySavedGameSummary | null>(null);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<JourneyPlayerReadModel | null>(null);

  useEffect(() => {
    if (!game?.id) {
      return;
    }

    saveJourneyGameId(game.id);
    setStoredGameId(game.id);
  }, [game]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setGameConfigs([]);
      setSelectedGameConfigId("");
      setGameConfigsError(null);
      setIsLoadingGameConfigs(false);
      return;
    }

    let cancelled = false;

    async function loadGameConfigs() {
      setGameConfigsError(null);
      setIsLoadingGameConfigs(true);

      try {
        const nextGameConfigs = await getJourneyGameConfigsRequest(selectedProject.id);

        if (cancelled) {
          return;
        }

        const resolvedGameConfigId = resolveSelectedGameConfigId(nextGameConfigs);
        setGameConfigs(nextGameConfigs);
        setSelectedGameConfigId(resolvedGameConfigId);

        if (resolvedGameConfigId) {
          saveSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY, resolvedGameConfigId);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setGameConfigs([]);
        setSelectedGameConfigId("");
        setGameConfigsError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsLoadingGameConfigs(false);
        }
      }
    }

    void loadGameConfigs();

    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!game) {
      return;
    }

    if (game.projectId !== (selectedProject?.id ?? "")) {
      resetJourneyPageState();
    }
  }, [game, selectedProject?.id]);

  const playerNameErrors = useMemo(() => getPlayerNameErrors(playerNames), [playerNames]);
  const selectedJourneyGameConfig = useMemo(
    () => gameConfigs.find((gameConfig) => gameConfig.id === selectedGameConfigId) ?? null,
    [gameConfigs, selectedGameConfigId],
  );
  const selectedJourneyRules = selectedJourneyGameConfig?.rules ?? null;
  const selectedCurrencies = selectedProject?.currencies ?? [];
  const journeyRules = useMemo(() => game?.rules ?? selectedJourneyRules ?? DEFAULT_JOURNEY_RULES, [game, selectedJourneyRules]);
  const journeyCurrencies = useMemo(() => game?.currencies ?? selectedCurrencies, [game, selectedCurrencies]);
  const journeyConfig = useMemo(
    () => game?.journeyConfig ?? getJourneyConfig(journeyRules, journeyCurrencies),
    [game, journeyCurrencies, journeyRules],
  );
  const journeyAchievements = useMemo(
    () => game?.journeyAchievements ?? getJourneyAchievements(journeyRules),
    [game, journeyRules],
  );
  const collectorTargets = game?.collectorTargets ?? [];
  const achievementProgressByPlayerId = game?.achievementProgressByPlayerId ?? {};
  const canStartGame =
    Boolean(selectedProject?.id) &&
    Boolean(selectedJourneyGameConfig) &&
    playerNames.length > 0 &&
    playerNameErrors.every((error) => !error);

  const activePlayers = useMemo<JourneyPlayerReadModel[]>(() => getJourneyActivePlayers(game), [game]);
  const finishedPlayers = useMemo<JourneyPlayerReadModel[]>(() => getJourneyFinishedPlayers(game), [game]);
  const results = useMemo<JourneyPlayerReadModel[]>(() => getJourneyResults(game), [game]);
  const gameIsOver = isJourneyGameOver(game);
  const activeGame = Boolean(game && !gameIsOver);
  const totalGamePlayers = useMemo(() => getJourneyVisiblePlayers(game).length, [game]);
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isLoadingSavedGames ||
      isLoadingGameConfigs ||
      isDeletingSavedGame ||
      isResettingGame ||
      isSubmittingRound ||
      isImportingPlayers ||
      isImportingMoves ||
      Boolean(removingPlayerId),
    [
      isDeletingSavedGame,
      isImportingMoves,
      isImportingPlayers,
      isLoadingGameConfigs,
      isLoadingSavedGames,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
      isSubmittingRound,
      removingPlayerId,
    ],
  );
  const setupActionsDisabled = useMemo(
    () => isStartingGame || isImportingPlayers || isLoadingGameConfigs || isRestoringGame || isResettingGame,
    [isImportingPlayers, isLoadingGameConfigs, isResettingGame, isRestoringGame, isStartingGame],
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
    const resolvedDjName = game?.djName?.trim() || djName.trim();
    const rulesetLabel: JourneyStatusChip = {
      label: `${journeyTexts.statuses.rulesetPrefix} ${game?.configName ?? selectedJourneyGameConfig?.name ?? NO_PRESET_SELECTED_LABEL}`,
      color: "secondary",
    };

    if (!game) {
      return [
        { label: journeyTexts.statuses.notStarted, color: "default" },
        rulesetLabel,
        ...(resolvedDjName ? [{ label: `${journeyTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" as const }] : []),
      ];
    }

    const chips: JourneyStatusChip[] = [
      {
        label: gameIsOver ? journeyTexts.statuses.complete : journeyTexts.statuses.active,
        color: gameIsOver ? "success" : "default",
      },
      rulesetLabel,
    ];

    if (activeGame) {
      chips.push({ label: `${journeyTexts.statuses.roundPrefix} ${game.roundsCount}`, color: "primary" });
      chips.push({ label: `${totalGamePlayers} ${journeyTexts.statuses.playersSuffix}`, color: "info" });
    }

    if (resolvedDjName) {
      chips.push({ label: `${journeyTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" });
    }

    return chips;
  }, [activeGame, djName, game, gameIsOver, selectedJourneyGameConfig?.name, totalGamePlayers]);

  function resetRoundUi(players: Array<{ id: string }> = []) {
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
    setForumStateLogEntries([]);
    resetRoundUi([]);
  }

  function selectGameConfig(nextGameConfigId: string) {
    setSelectedGameConfigId(nextGameConfigId);
    saveSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY, nextGameConfigId);
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const filteredSavedGames = selectedProject?.id ? await listJourneyGamesRequest(selectedProject.id) : [];

      setSavedGames(filteredSavedGames);
      return filteredSavedGames;
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
    if (!gameId || !selectedProject?.id) {
      return;
    }

    setSavedGamesError(null);
    setIsRestoringGame(true);

    try {
      const restoredGame = await getJourneyGameByIdRequest(selectedProject.id, gameId);

      if (selectedProject?.id && restoredGame.projectId !== selectedProject.id) {
        setSavedGamesError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
        return;
      }

      setGame(restoredGame);
      setForumStateLogEntries([]);
      resetRoundUi(getJourneyActivePlayers(restoredGame));
      setSavedGamesDialogOpen(false);
      setStoredGameId(restoredGame.id);

      if (gameConfigs.some((gameConfig) => gameConfig.id === restoredGame.configId)) {
        setSelectedGameConfigId(restoredGame.configId);
        saveSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY, restoredGame.configId);
      }
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
      await deleteJourneyGameRequest(deletingSavedGame.projectId, deletingSavedGame.id);
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
    if (!cleanNames.length || !selectedProject?.id || !selectedJourneyGameConfig || !selectedJourneyRules) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createJourneyGameRequest({
        projectId: selectedProject.id,
        gameConfigId: selectedJourneyGameConfig.id,
        nicknames: cleanNames,
        djName: djName.trim(),
      });

      setGame(nextGame);
      setForumStateLogEntries([]);
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
      const nextGame = await submitJourneyRoundRequest(game.projectId, game.id, {
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

  async function addForumStateToLog() {
    if (!game?.id || isAddingForumState) {
      return;
    }

    setRequestError(null);
    setIsAddingForumState(true);

    try {
      const forumState = await getJourneyForumStateRequest(game.projectId, game.id);
      setForumStateLogEntries((currentEntries) => [...currentEntries, forumState.text]);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsAddingForumState(false);
    }
  }

  async function removePlayerFromGame(playerId: string) {
    if (!game?.id) {
      return false;
    }

    setRequestError(null);
    setRemovingPlayerId(playerId);

    try {
      const nextGame = await removeJourneyPlayerRequest(game.projectId, game.id, playerId);
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
      return true;
    } catch (error) {
      setRequestError(getErrorMessage(error));
      return false;
    } finally {
      setRemovingPlayerId(null);
    }
  }

  function requestRemovePlayerFromGame(playerId: string) {
    const nextPendingPlayer = activePlayers.find((player) => player.id === playerId) ?? null;

    if (!nextPendingPlayer) {
      return;
    }

    setPlayerPendingRemoval(nextPendingPlayer);
  }

  function cancelRemovePlayerFromGame() {
    if (removingPlayerId) {
      return;
    }

    setPlayerPendingRemoval(null);
  }

  async function confirmRemovePlayerFromGame() {
    if (!playerPendingRemoval) {
      return;
    }

    const removed = await removePlayerFromGame(playerPendingRemoval.id);

    if (removed) {
      setPlayerPendingRemoval(null);
    }
  }

  return {
    game,
    gameConfigs,
    selectedGameConfigId,
    playerNames,
    playerNameErrors,
    playersImportText,
    movesImportText,
    moveInputs,
    skippedPlayers,
    playerPendingRemoval,
    savedGames,
    storedGameId,
    deletingSavedGame,
    savedGamesDialogOpen,
    savedGamesError,
    playersImportOpen,
    movesImportOpen,
    rulesDialogOpen,
    requestError,
    gameConfigsError,
    selectedJourneyRules,
    journeyConfig,
    journeyAchievements,
    collectorTargets,
    achievementProgressByPlayerId,
    canStartGame,
    activePlayers,
    finishedPlayers,
    results,
    gameIsOver,
    headerActionsDisabled,
    setupActionsDisabled,
    roundActionsDisabled,
    canSubmitRound,
    playerTimelines,
    forumLogEntries: [...(game?.forumLog ?? []), ...forumStateLogEntries],
    pageStatusChips,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isLoadingGameConfigs,
      isDeletingSavedGame,
      isResettingGame,
      isSubmittingRound,
      isImportingPlayers,
      isImportingMoves,
      isAddingForumState,
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
      selectGameConfig,
      openSavedGamesDialog,
      restoreSavedGame,
      requestDeleteSavedGame,
      cancelDeleteSavedGame,
      confirmDeleteSavedGame,
      requestRemovePlayerFromGame,
      cancelRemovePlayerFromGame,
      confirmRemovePlayerFromGame,
      startGame,
      restartGame,
      addPlayerField,
      changePlayerName,
      removePlayerField,
      importPlayers,
      changeMoveInput,
      toggleSkip,
      importMoves,
      addForumStateToLog,
      submitRound,
      removePlayerFromGame,
    },
  };
}
