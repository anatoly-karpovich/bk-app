import { useEffect, useMemo, useState } from "react";
import { useGameRoute } from "../../../hooks/useGameRoute";
import { getBattleshipsGameConfigsRequest, getSelectedGameConfigStorageKey } from "../../projects/api/projects.client";
import { loadSelectedGameConfigId, saveSelectedGameConfigId } from "../../projects/storage";
import type { BattleshipsGameConfig, Project } from "../../projects/types";
import {
  createBattleshipsGameRequest,
  deleteBattleshipsGameRequest,
  getBattleshipsGameByIdRequest,
  listBattleshipsGamesRequest,
  submitBattleshipsShotRequest,
  undoBattleshipsShotRequest,
} from "../api/battleships.client";
import type { BattleshipsPersistedGame, BattleshipsSavedGameSummary } from "../types";
import {
  createBattleshipsFleetSummary,
  createBattleshipsStatusChips,
  getBattleshipsBoardConfig,
} from "../mappers/battleships.mapper";

interface UseBattleshipsGameParams {
  djName: string;
  selectedProject: Project | null;
}

const BATTLESHIPS_GAME_CONFIG_STORAGE_KEY = getSelectedGameConfigStorageKey("battleships");
const SAVED_GAME_PROJECT_MISMATCH_ERROR = "Saved game belongs to another project.";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Battleships request failed";
}

function resolveSelectedGameConfigId(gameConfigs: BattleshipsGameConfig[]) {
  const storedGameConfigId = loadSelectedGameConfigId(BATTLESHIPS_GAME_CONFIG_STORAGE_KEY);
  const fallbackGameConfigId = gameConfigs[0]?.id ?? "";

  return (
    (storedGameConfigId &&
      gameConfigs.some((gameConfig) => gameConfig.id === storedGameConfigId) &&
      storedGameConfigId) ||
    fallbackGameConfigId
  );
}

export function useBattleshipsGame({ djName, selectedProject }: UseBattleshipsGameParams) {
  const { gameId, openGame, openSetup } = useGameRoute("/battleship");
  const [game, setGame] = useState<BattleshipsPersistedGame | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [savedGames, setSavedGames] = useState<BattleshipsSavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [gameConfigsError, setGameConfigsError] = useState<string | null>(null);
  const [gameConfigs, setGameConfigs] = useState<BattleshipsGameConfig[]>([]);
  const [selectedGameConfigId, setSelectedGameConfigId] = useState(
    () => loadSelectedGameConfigId(BATTLESHIPS_GAME_CONFIG_STORAGE_KEY) ?? "",
  );
  const [deletingSavedGame, setDeletingSavedGame] = useState<BattleshipsSavedGameSummary | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isLoadingGameConfigs, setIsLoadingGameConfigs] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isRefreshingGame, setIsRefreshingGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isSubmittingShot, setIsSubmittingShot] = useState(false);
  const [isUndoingShot, setIsUndoingShot] = useState(false);

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
        const nextGameConfigs = await getBattleshipsGameConfigsRequest(selectedProject.id);

        if (cancelled) {
          return;
        }

        const resolvedGameConfigId = resolveSelectedGameConfigId(nextGameConfigs);
        setGameConfigs(nextGameConfigs);
        setSelectedGameConfigId(resolvedGameConfigId);

        if (resolvedGameConfigId) {
          saveSelectedGameConfigId(BATTLESHIPS_GAME_CONFIG_STORAGE_KEY, resolvedGameConfigId);
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
        resetBattleshipsPageState();
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
        const restoredGame = await getBattleshipsGameByIdRequest(selectedProject.id, gameId);

        if (cancelled) {
          return;
        }

        if (restoredGame.projectId !== selectedProject.id) {
          setRequestError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
          openSetup({ replace: true });
          return;
        }

        setGame(restoredGame);
        setPlayerName(restoredGame.playerName);
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
      resetBattleshipsPageState();
      openSetup({ replace: true });
    }
  }, [game, openSetup, selectedProject?.id]);

  const selectedBattleshipsGameConfig = useMemo(
    () => gameConfigs.find((gameConfig) => gameConfig.id === selectedGameConfigId) ?? null,
    [gameConfigs, selectedGameConfigId],
  );
  const selectedBattleshipsRules = selectedBattleshipsGameConfig?.rules ?? null;
  const resolvedResources = game?.resources ?? selectedProject?.resources ?? [];
  const boardConfig = useMemo(
    () =>
      game?.derived.boardConfig ??
      (selectedBattleshipsRules ? getBattleshipsBoardConfig(selectedBattleshipsRules) : null),
    [game, selectedBattleshipsRules],
  );
  const fleetSummary = useMemo(
    () => game?.derived.fleetSummary ?? createBattleshipsFleetSummary(boardConfig),
    [boardConfig, game],
  );
  const canStartGame =
    Boolean(selectedProject?.id) && Boolean(selectedBattleshipsRules) && Boolean(playerName.trim()) && !game;
  const pageStatusChips = useMemo(
    () =>
      createBattleshipsStatusChips({
        game,
        djName,
        selectedGameConfigName: selectedBattleshipsGameConfig?.name,
      }),
    [djName, game, selectedBattleshipsGameConfig?.name],
  );
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isLoadingSavedGames ||
      isLoadingGameConfigs ||
      isDeletingSavedGame ||
      isRefreshingGame ||
      isResettingGame ||
      isSubmittingShot ||
      isUndoingShot,
    [
      isDeletingSavedGame,
      isLoadingGameConfigs,
      isLoadingSavedGames,
      isRefreshingGame,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
      isSubmittingShot,
      isUndoingShot,
    ],
  );
  const boardActionsDisabled = useMemo(
    () => isSubmittingShot || isUndoingShot || isResettingGame || isRestoringGame,
    [isResettingGame, isRestoringGame, isSubmittingShot, isUndoingShot],
  );
  const canUndoShot = Boolean(game?.shots.length) && !boardActionsDisabled;

  function resetBattleshipsPageState() {
    setGame(null);
    setPlayerName("");
  }

  function selectGameConfig(nextGameConfigId: string) {
    setSelectedGameConfigId(nextGameConfigId);
    saveSelectedGameConfigId(BATTLESHIPS_GAME_CONFIG_STORAGE_KEY, nextGameConfigId);
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const filteredSavedGames = selectedProject?.id ? await listBattleshipsGamesRequest(selectedProject.id) : [];

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
      const restoredGame = await getBattleshipsGameByIdRequest(selectedProject.id, gameId);

      if (selectedProject?.id && restoredGame.projectId !== selectedProject.id) {
        setSavedGamesError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
        return;
      }

      setGame(restoredGame);
      setPlayerName(restoredGame.playerName);
      setSavedGamesDialogOpen(false);
      openGame(restoredGame.id);

      if (gameConfigs.some((gameConfig) => gameConfig.id === restoredGame.configId)) {
        setSelectedGameConfigId(restoredGame.configId);
        saveSelectedGameConfigId(BATTLESHIPS_GAME_CONFIG_STORAGE_KEY, restoredGame.configId);
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
      const refreshedGame = await getBattleshipsGameByIdRequest(selectedProject.id, game.id);

      if (refreshedGame.projectId !== selectedProject.id) {
        setRequestError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
        return;
      }

      setGame(refreshedGame);
      setPlayerName(refreshedGame.playerName);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsRefreshingGame(false);
    }
  }

  function requestDeleteSavedGame(gameToDelete: BattleshipsSavedGameSummary) {
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
      await deleteBattleshipsGameRequest(deletingSavedGame.projectId, deletingSavedGame.id);
      setSavedGames((current) => current.filter((gameItem) => gameItem.id !== deletingSavedGame.id));

      if (game?.id === deletingSavedGame.id) {
        resetBattleshipsPageState();
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
    if (!playerName.trim() || !selectedProject?.id || !selectedBattleshipsGameConfig || !selectedBattleshipsRules) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createBattleshipsGameRequest({
        projectId: selectedProject.id,
        playerName: playerName.trim(),
        gameConfigId: selectedBattleshipsGameConfig.id,
      });

      setGame(nextGame);
      setPlayerName(nextGame.playerName);
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
    resetBattleshipsPageState();
    openSetup();
    setIsResettingGame(false);
  }

  async function fireShot(row: number, column: number) {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setIsSubmittingShot(true);

    try {
      const nextGame = await submitBattleshipsShotRequest(game.projectId, game.id, { row, column });
      setGame(nextGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsSubmittingShot(false);
    }
  }

  async function undoShot() {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setIsUndoingShot(true);

    try {
      const nextGame = await undoBattleshipsShotRequest(game.projectId, game.id);
      setGame(nextGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsUndoingShot(false);
    }
  }

  return {
    game,
    gameConfigs,
    selectedGameConfigId,
    playerName,
    savedGames,
    currentGameId: game?.id ?? null,
    deletingSavedGame,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    gameConfigsError,
    selectedBattleshipsRules,
    resolvedResources,
    boardConfig,
    fleetSummary,
    canStartGame,
    canUndoShot,
    pageStatusChips,
    headerActionsDisabled,
    boardActionsDisabled,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isLoadingGameConfigs,
      isDeletingSavedGame,
      isRefreshingGame,
      isResettingGame,
      isSubmittingShot,
      isUndoingShot,
    },
    actions: {
      setPlayerName,
      setSavedGamesDialogOpen,
      setRulesDialogOpen,
      setRequestError,
      selectGameConfig,
      openSavedGamesDialog,
      restoreSavedGame,
      refreshGame,
      requestDeleteSavedGame,
      cancelDeleteSavedGame,
      confirmDeleteSavedGame,
      startGame,
      restartGame,
      fireShot,
      undoShot,
    },
  };
}
