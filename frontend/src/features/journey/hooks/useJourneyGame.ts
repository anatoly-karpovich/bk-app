import { useEffect, useMemo, useState } from "react";
import { useGameRoute } from "../../../hooks/useGameRoute";
import { getJourneyGameConfigsRequest, getSelectedGameConfigStorageKey } from "../../projects/api/projects.client";
import { loadSelectedGameConfigId, saveSelectedGameConfigId } from "../../projects/storage";
import type { JourneyGameConfig, Project } from "../../projects/types";
import {
  createJourneyGameRequest,
  deleteJourneyGameRequest,
  getJourneyForumStateRequest,
  getJourneyGameByIdRequest,
  importJourneyPlayersFromForumRequest,
  previewJourneyForumMovesRequest,
  listJourneyGamesRequest,
  parseJourneyMovesRequest,
  parseJourneyPlayersRequest,
  removeJourneyPlayerRequest,
  submitJourneyRoundRequest,
} from "../api/journey.client";
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
import type {
  JourneyForumStateMessage,
  JourneyMoveInputs,
  JourneyForumMovesPreview,
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
    (storedGameConfigId &&
      gameConfigs.some((gameConfig) => gameConfig.id === storedGameConfigId) &&
      storedGameConfigId) ||
    fallbackGameConfigId
  );
}

function mergeUniquePlayerNames(...nameGroups: string[][]): string[] {
  const namesByNormalizedName = new Map<string, string>();

  for (const name of nameGroups.flat()) {
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLocaleLowerCase("ru-RU");
    if (trimmedName && !namesByNormalizedName.has(normalizedName)) {
      namesByNormalizedName.set(normalizedName, trimmedName);
    }
  }

  return [...namesByNormalizedName.values()];
}

export function useJourneyGame({ djName, selectedProject }: UseJourneyGameParams) {
  const { gameId, openGame, openSetup } = useGameRoute("/journey");
  const [game, setGame] = useState<JourneyPageGame | null>(null);
  const [playerNames, setPlayerNames] = useState([""]);
  const [forumTopicId, setForumTopicId] = useState("");
  const [playersImportText, setPlayersImportText] = useState("");
  const [movesImportText, setMovesImportText] = useState("");
  const [moveInputs, setMoveInputs] = useState<JourneyMoveInputs>({});
  const [skippedPlayers, setSkippedPlayers] = useState<JourneySkippedPlayers>({});
  const [savedGames, setSavedGames] = useState<JourneySavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [playersImportOpen, setPlayersImportOpen] = useState(false);
  const [movesImportOpen, setMovesImportOpen] = useState(false);
  const [forumMovesPreview, setForumMovesPreview] = useState<JourneyForumMovesPreview | null>(null);
  const [forumMovesPreviewOpen, setForumMovesPreviewOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [gameConfigsError, setGameConfigsError] = useState<string | null>(null);
  const [gameConfigs, setGameConfigs] = useState<JourneyGameConfig[]>([]);
  const [selectedGameConfigId, setSelectedGameConfigId] = useState(
    () => loadSelectedGameConfigId(JOURNEY_GAME_CONFIG_STORAGE_KEY) ?? "",
  );
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isLoadingGameConfigs, setIsLoadingGameConfigs] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isRefreshingGame, setIsRefreshingGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [isImportingPlayers, setIsImportingPlayers] = useState(false);
  const [isImportingPlayersFromForum, setIsImportingPlayersFromForum] = useState(false);
  const [isImportingMoves, setIsImportingMoves] = useState(false);
  const [isPreviewingForumMoves, setIsPreviewingForumMoves] = useState(false);
  const [isAddingForumState, setIsAddingForumState] = useState(false);
  const [forumState, setForumState] = useState<JourneyForumStateMessage | null>(null);
  const [forumStateDialogOpen, setForumStateDialogOpen] = useState(false);
  const [deletingSavedGame, setDeletingSavedGame] = useState<JourneySavedGameSummary | null>(null);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<JourneyPlayerReadModel | null>(null);

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
    if (!gameId) {
      if (game) {
        resetJourneyPageState();
      }
      return;
    }

    if (!selectedProject?.id || game?.id === gameId) {
      return;
    }

    let cancelled = false;

    async function loadGameFromRoute() {
      setRequestError(null);
      setIsRestoringGame(true);

      try {
        const restoredGame = await getJourneyGameByIdRequest(selectedProject.id, gameId);

        if (cancelled) {
          return;
        }

        if (restoredGame.projectId !== selectedProject.id) {
          setRequestError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
          openSetup({ replace: true });
          return;
        }

        setGame(restoredGame);
        setForumState(null);
        setForumStateDialogOpen(false);
        resetRoundUi(getJourneyActivePlayers(restoredGame));
        setSelectedGameConfigId(restoredGame.configId);
      } catch (error) {
        if (!cancelled) {
          setRequestError(getErrorMessage(error));
          openSetup({ replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsRestoringGame(false);
        }
      }
    }

    void loadGameFromRoute();

    return () => {
      cancelled = true;
    };
  }, [game?.id, gameId, openSetup, selectedProject?.id]);

  useEffect(() => {
    if (!game) {
      return;
    }

    if (game.projectId !== (selectedProject?.id ?? "")) {
      resetJourneyPageState();
      openSetup({ replace: true });
    }
  }, [game, openSetup, selectedProject?.id]);

  const playerNameErrors = useMemo(() => getPlayerNameErrors(playerNames), [playerNames]);
  const validPlayersCount = playerNameErrors.filter((error) => !error).length;
  const selectedJourneyGameConfig = useMemo(
    () => gameConfigs.find((gameConfig) => gameConfig.id === selectedGameConfigId) ?? null,
    [gameConfigs, selectedGameConfigId],
  );
  const journeyConfig = game?.journeyConfig ?? selectedJourneyGameConfig?.journeyConfig ?? null;
  const journeyAchievements = game?.journeyAchievements ?? selectedJourneyGameConfig?.journeyAchievements ?? null;
  const collectorTargets = game?.collectorTargets ?? [];
  const achievementProgressByPlayerId = game?.achievementProgressByPlayerId ?? {};
  const canStartGame =
    Boolean(selectedProject?.id) &&
    Boolean(selectedJourneyGameConfig) &&
    playerNames.length > 0 &&
    playerNameErrors.every((error) => !error);
  const canImportPlayersFromForum = Boolean(
    selectedProject?.id && djName.trim() && Number.isSafeInteger(Number(forumTopicId)) && Number(forumTopicId) > 0,
  );

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
      isRefreshingGame ||
      isResettingGame ||
      isSubmittingRound ||
      isImportingPlayers ||
      isImportingPlayersFromForum ||
      isImportingMoves ||
      Boolean(removingPlayerId),
    [
      isDeletingSavedGame,
      isImportingMoves,
      isImportingPlayers,
      isImportingPlayersFromForum,
      isLoadingGameConfigs,
      isLoadingSavedGames,
      isRefreshingGame,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
      isSubmittingRound,
      removingPlayerId,
    ],
  );
  const setupActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isImportingPlayers ||
      isImportingPlayersFromForum ||
      isLoadingGameConfigs ||
      isRestoringGame ||
      isResettingGame,
    [
      isImportingPlayers,
      isImportingPlayersFromForum,
      isLoadingGameConfigs,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
    ],
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

    return (
      Boolean(journeyConfig) &&
      activeMovePlayers.every((player) => isValidDiceValue(moveInputs[player.id], journeyConfig))
    );
  }, [activePlayers, journeyConfig, moveInputs, skippedPlayers]);

  const playerTimelines = useMemo<Record<string, JourneyTimelineEntry[]>>(
    () => getJourneyPlayerTimelines(game),
    [game],
  );

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
        ...(resolvedDjName
          ? [{ label: `${journeyTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" as const }]
          : []),
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
    setGame(null);
    setPlayerNames([""]);
    setForumTopicId("");
    setPlayersImportText("");
    setForumState(null);
    setForumStateDialogOpen(false);
    setForumMovesPreview(null);
    setForumMovesPreviewOpen(false);
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
      setForumState(null);
      setForumStateDialogOpen(false);
      resetRoundUi(getJourneyActivePlayers(restoredGame));
      setSavedGamesDialogOpen(false);
      openGame(restoredGame.id);

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

  async function refreshGame() {
    if (!game?.id || !selectedProject?.id) {
      return;
    }

    setRequestError(null);
    setIsRefreshingGame(true);

    try {
      const refreshedGame = await getJourneyGameByIdRequest(selectedProject.id, game.id);

      if (refreshedGame.projectId !== selectedProject.id) {
        setRequestError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
        return;
      }

      setGame(refreshedGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsRefreshingGame(false);
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

      if (game?.id === deletingSavedGame.id) {
        resetJourneyPageState();
        openSetup({ replace: true });
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
    if (!cleanNames.length || !selectedProject?.id || !selectedJourneyGameConfig) {
      return;
    }

    const parsedForumTopicId = forumTopicId ? Number(forumTopicId) : undefined;
    if (parsedForumTopicId !== undefined && (!Number.isSafeInteger(parsedForumTopicId) || parsedForumTopicId < 1)) {
      setRequestError(journeyTexts.validation.invalidForumTopic);
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createJourneyGameRequest({
        projectId: selectedProject.id,
        gameConfigId: selectedJourneyGameConfig.id,
        nicknames: cleanNames,
        forumTopicId: parsedForumTopicId,
      });

      setGame(nextGame);
      setForumState(null);
      setForumStateDialogOpen(false);
      resetRoundUi(getJourneyActivePlayers(nextGame));
      openGame(nextGame.id);
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
    openSetup();
    setIsResettingGame(false);
  }

  function addPlayerField() {
    setPlayerNames((current) => [...current, ""]);
  }

  function changePlayerName(index: number, value: string) {
    setPlayerNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function changeForumTopicId(value: string) {
    setForumTopicId(value);
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
      if (!selectedProject?.id) return false;
      const importedNames = await parseJourneyPlayersRequest(selectedProject.id, playersImportText);

      if (!importedNames.length) {
        return false;
      }

      setPlayerNames((current) => mergeUniquePlayerNames(current, importedNames));

      return true;
    } catch (error) {
      setRequestError(getErrorMessage(error));
      return false;
    } finally {
      setIsImportingPlayers(false);
    }
  }

  async function importPlayersFromForum() {
    const parsedForumTopicId = Number(forumTopicId);
    if (!selectedProject?.id || !djName.trim() || !Number.isSafeInteger(parsedForumTopicId) || parsedForumTopicId < 1) {
      return;
    }

    setRequestError(null);
    setIsImportingPlayersFromForum(true);

    try {
      const importedNames = await importJourneyPlayersFromForumRequest(selectedProject.id, {
        forumTopicId: parsedForumTopicId,
      });

      if (!importedNames.length) {
        return;
      }

      setPlayerNames((current) => mergeUniquePlayerNames(current, importedNames));
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsImportingPlayersFromForum(false);
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

  async function previewForumMoves() {
    if (!game?.id || isPreviewingForumMoves) {
      return;
    }

    setRequestError(null);
    setIsPreviewingForumMoves(true);

    try {
      const preview = await previewJourneyForumMovesRequest(game.projectId, game.id);
      setForumMovesPreview(preview);
      setForumMovesPreviewOpen(true);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsPreviewingForumMoves(false);
    }
  }

  function closeForumMovesPreview() {
    setForumMovesPreviewOpen(false);
  }

  function applyForumMovesPreview() {
    if (!forumMovesPreview) {
      return;
    }

    setMoveInputs((current) => ({
      ...current,
      ...Object.fromEntries(forumMovesPreview.moves.map((move) => [move.playerId, String(move.dice)])),
    }));
    setForumMovesPreviewOpen(false);
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

  async function getForumState() {
    if (!game?.id || isAddingForumState) {
      return;
    }

    setRequestError(null);
    setIsAddingForumState(true);

    try {
      const forumState = await getJourneyForumStateRequest(game.projectId, game.id);
      setForumState(forumState);
      setForumStateDialogOpen(true);
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
    validPlayersCount,
    forumTopicId,
    canImportPlayersFromForum,
    playersImportText,
    movesImportText,
    moveInputs,
    skippedPlayers,
    playerPendingRemoval,
    savedGames,
    currentGameId: game?.id ?? null,
    deletingSavedGame,
    savedGamesDialogOpen,
    savedGamesError,
    playersImportOpen,
    movesImportOpen,
    forumMovesPreview,
    forumMovesPreviewOpen,
    forumState,
    forumStateDialogOpen,
    rulesDialogOpen,
    requestError,
    gameConfigsError,
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
    forumLogEntries: game?.forumLog ?? [],
    pageStatusChips,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isLoadingGameConfigs,
      isDeletingSavedGame,
      isRefreshingGame,
      isResettingGame,
      isSubmittingRound,
      isImportingPlayers,
      isImportingPlayersFromForum,
      isImportingMoves,
      isPreviewingForumMoves,
      isAddingForumState,
      removingPlayerId,
    },
    actions: {
      setSavedGamesDialogOpen,
      setPlayersImportOpen,
      setMovesImportOpen,
      setRulesDialogOpen,
      setForumStateDialogOpen,
      setPlayersImportText,
      setMovesImportText,
      setRequestError,
      selectGameConfig,
      openSavedGamesDialog,
      restoreSavedGame,
      refreshGame,
      requestDeleteSavedGame,
      cancelDeleteSavedGame,
      confirmDeleteSavedGame,
      requestRemovePlayerFromGame,
      cancelRemovePlayerFromGame,
      confirmRemovePlayerFromGame,
      startGame,
      changeForumTopicId,
      restartGame,
      addPlayerField,
      changePlayerName,
      removePlayerField,
      importPlayers,
      importPlayersFromForum,
      changeMoveInput,
      toggleSkip,
      importMoves,
      previewForumMoves,
      closeForumMovesPreview,
      applyForumMovesPreview,
      getForumState,
      submitRound,
      removePlayerFromGame,
    },
  };
}
