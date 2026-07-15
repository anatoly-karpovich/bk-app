import { useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../../configs/types";
import {
  createBattleshipsGameRequest,
  deleteBattleshipsGameRequest,
  getBattleshipsGameByIdRequest,
  listBattleshipsGamesRequest,
  submitBattleshipsShotRequest,
  undoBattleshipsShotRequest,
} from "../api/battleships.client";
import { clearBattleshipsGame, loadBattleshipsGameId, saveBattleshipsGameId } from "../storage";
import type { BattleshipsPersistedGame, BattleshipsSavedGameSummary } from "../types";
import {
  createBattleshipsFleetSummary,
  createBattleshipsStatusChips,
  getBattleshipsBoardConfig,
} from "../mappers/battleships.mapper";

interface UseBattleshipsGameParams {
  djName: string;
  selectedConfig: AppConfig | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Battleships request failed";
}

export function useBattleshipsGame({ djName, selectedConfig }: UseBattleshipsGameParams) {
  const [game, setGame] = useState<BattleshipsPersistedGame | null>(null);
  const [storedGameId, setStoredGameId] = useState<string | null>(loadBattleshipsGameId());
  const [playerName, setPlayerName] = useState("");
  const [savedGames, setSavedGames] = useState<BattleshipsSavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [deletingSavedGame, setDeletingSavedGame] = useState<BattleshipsSavedGameSummary | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isSubmittingShot, setIsSubmittingShot] = useState(false);
  const [isUndoingShot, setIsUndoingShot] = useState(false);

  useEffect(() => {
    if (!game?.id) {
      return;
    }

    saveBattleshipsGameId(game.id);
    setStoredGameId(game.id);
  }, [game]);

  const selectedBattleshipsRules = selectedConfig?.games.battleships ?? null;
  const resolvedCurrencies = game?.currencies ?? selectedConfig?.currencies ?? [];
  const boardConfig = useMemo(
    () => game?.derived.boardConfig ?? (selectedBattleshipsRules ? getBattleshipsBoardConfig(selectedBattleshipsRules) : null),
    [game, selectedBattleshipsRules],
  );
  const fleetSummary = useMemo(
    () => game?.derived.fleetSummary ?? createBattleshipsFleetSummary(boardConfig),
    [boardConfig, game],
  );
  const canStartGame = Boolean(selectedBattleshipsRules) && Boolean(playerName.trim()) && !game;
  const pageStatusChips = useMemo(
    () =>
      createBattleshipsStatusChips({
        game,
        djName,
        selectedConfigName: selectedConfig?.name,
      }),
    [djName, game, selectedConfig?.name],
  );
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isLoadingSavedGames ||
      isDeletingSavedGame ||
      isResettingGame ||
      isSubmittingShot ||
      isUndoingShot,
    [isDeletingSavedGame, isLoadingSavedGames, isResettingGame, isRestoringGame, isStartingGame, isSubmittingShot, isUndoingShot],
  );
  const boardActionsDisabled = useMemo(
    () => isSubmittingShot || isUndoingShot || isResettingGame || isRestoringGame,
    [isResettingGame, isRestoringGame, isSubmittingShot, isUndoingShot],
  );
  const canUndoShot = Boolean(game?.shots.length) && !boardActionsDisabled;

  function resetBattleshipsPageState() {
    clearBattleshipsGame();
    setStoredGameId(null);
    setGame(null);
    setPlayerName("");
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const nextSavedGames = await listBattleshipsGamesRequest();
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
      const restoredGame = await getBattleshipsGameByIdRequest(gameId);
      setGame(restoredGame);
      setPlayerName(restoredGame.playerName);
      setSavedGamesDialogOpen(false);
      setStoredGameId(restoredGame.id);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsRestoringGame(false);
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
      await deleteBattleshipsGameRequest(deletingSavedGame.id);
      setSavedGames((current) => current.filter((gameItem) => gameItem.id !== deletingSavedGame.id));

      if (storedGameId === deletingSavedGame.id) {
        clearBattleshipsGame();
        setStoredGameId(null);
      }

      if (game?.id === deletingSavedGame.id) {
        resetBattleshipsPageState();
      }

      setDeletingSavedGame(null);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsDeletingSavedGame(false);
    }
  }

  async function startGame() {
    if (!playerName.trim() || !selectedConfig?.id || !selectedBattleshipsRules) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createBattleshipsGameRequest({
        playerName: playerName.trim(),
        configId: selectedConfig.id,
        djName: djName.trim(),
      });

      setGame(nextGame);
      setPlayerName(nextGame.playerName);
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
    setIsResettingGame(false);
  }

  async function fireShot(row: number, column: number) {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setIsSubmittingShot(true);

    try {
      const nextGame = await submitBattleshipsShotRequest(game.id, { row, column });
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
      const nextGame = await undoBattleshipsShotRequest(game.id);
      setGame(nextGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsUndoingShot(false);
    }
  }

  return {
    game,
    playerName,
    savedGames,
    storedGameId,
    deletingSavedGame,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    selectedBattleshipsRules,
    resolvedCurrencies,
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
      isDeletingSavedGame,
      isResettingGame,
      isSubmittingShot,
      isUndoingShot,
    },
    actions: {
      setPlayerName,
      setSavedGamesDialogOpen,
      setRulesDialogOpen,
      setRequestError,
      openSavedGamesDialog,
      restoreSavedGame,
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
