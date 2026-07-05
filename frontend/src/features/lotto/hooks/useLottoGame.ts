import { useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../../configs/types";
import {
  createLottoGameRequest,
  deleteLottoGameRequest,
  drawLottoNumberRequest,
  getLottoGameByIdRequest,
  listLottoGamesRequest,
  removeLottoPlayerRequest,
} from "../api/lotto.client";
import { createLottoStatusChips, generateLottoCardNumbers, parseLottoNumbersInput, validateLottoCardNumbers } from "../mappers/lotto.mapper";
import { clearLottoGame, loadLottoGameId, saveLottoGameId } from "../storage";
import type {
  LottoPersistedGame,
  LottoPlayer,
  LottoSavedGameSummary,
  LottoSetupPlayerInput,
  LottoSetupPlayerInputError,
} from "../types";

interface UseLottoGameParams {
  djName: string;
  selectedConfig: AppConfig | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Lotto request failed";
}

function createEmptyPlayerInput(): LottoSetupPlayerInput {
  return {
    id: crypto.randomUUID(),
    nickname: "",
    cardNumbers: "",
  };
}

function getPlayerSetupErrors(
  players: LottoSetupPlayerInput[],
  game: LottoPersistedGame | null,
  selectedConfig: AppConfig | null,
): LottoSetupPlayerInputError[] {
  const rules = game?.rules ?? selectedConfig?.games.lotto ?? null;
  const nicknameCounts = players.reduce<Map<string, number>>((result, player) => {
    const key = player.nickname.trim().toLocaleLowerCase("ru");

    if (!key) {
      return result;
    }

    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map<string, number>());

  return players.map((player) => {
    const nickname = player.nickname.trim();
    const parsedNumbers = parseLottoNumbersInput(player.cardNumbers);

    return {
      nickname: !nickname
        ? "Введите ник игрока."
        : (nicknameCounts.get(nickname.toLocaleLowerCase("ru")) ?? 0) > 1
          ? "Ники игроков должны быть уникальными."
          : null,
      cardNumbers: validateLottoCardNumbers(parsedNumbers, rules),
    };
  });
}

export function useLottoGame({ djName, selectedConfig }: UseLottoGameParams) {
  const [game, setGame] = useState<LottoPersistedGame | null>(null);
  const [storedGameId, setStoredGameId] = useState<string | null>(loadLottoGameId());
  const [players, setPlayers] = useState<LottoSetupPlayerInput[]>([createEmptyPlayerInput()]);
  const [savedGames, setSavedGames] = useState<LottoSavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [deletingSavedGame, setDeletingSavedGame] = useState<LottoSavedGameSummary | null>(null);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<LottoPlayer | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isDrawingNumber, setIsDrawingNumber] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!game?.id) {
      return;
    }

    saveLottoGameId(game.id);
    setStoredGameId(game.id);
  }, [game]);

  const selectedLottoRules = selectedConfig?.games.lotto ?? null;
  const resolvedRules = game?.rules ?? selectedLottoRules ?? null;
  const resolvedCurrency = game?.currency ?? selectedConfig?.currency ?? "";
  const playerErrors = useMemo(
    () => getPlayerSetupErrors(players, game, selectedConfig),
    [game, players, selectedConfig],
  );
  const canStartGame = Boolean(selectedLottoRules) && playerErrors.length > 0 && playerErrors.every((error) => !error.nickname && !error.cardNumbers);
  const pageStatusChips = useMemo(
    () =>
      createLottoStatusChips({
        game,
        djName,
        selectedConfigName: selectedConfig?.name,
      }),
    [djName, game, selectedConfig?.name],
  );
  const gameIsOver = game?.derived.gameIsOver ?? false;
  const headerActionsDisabled = useMemo(
    () =>
      isStartingGame ||
      isRestoringGame ||
      isLoadingSavedGames ||
      isDeletingSavedGame ||
      isResettingGame ||
      isDrawingNumber ||
      Boolean(removingPlayerId),
    [isDeletingSavedGame, isDrawingNumber, isLoadingSavedGames, isResettingGame, isRestoringGame, isStartingGame, removingPlayerId],
  );
  const boardActionsDisabled = useMemo(
    () => isDrawingNumber || isRestoringGame || isResettingGame || Boolean(removingPlayerId),
    [isDrawingNumber, isResettingGame, isRestoringGame, removingPlayerId],
  );
  const setupActionsDisabled = useMemo(
    () => isStartingGame || isRestoringGame || isResettingGame,
    [isResettingGame, isRestoringGame, isStartingGame],
  );

  function resetLottoPageState() {
    clearLottoGame();
    setStoredGameId(null);
    setGame(null);
    setPlayers([createEmptyPlayerInput()]);
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const nextSavedGames = await listLottoGamesRequest();
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
      const restoredGame = await getLottoGameByIdRequest(gameId);
      setGame(restoredGame);
      setSavedGamesDialogOpen(false);
      setStoredGameId(restoredGame.id);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsRestoringGame(false);
    }
  }

  function requestDeleteSavedGame(gameToDelete: LottoSavedGameSummary) {
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
      await deleteLottoGameRequest(deletingSavedGame.id);
      setSavedGames((current) => current.filter((gameItem) => gameItem.id !== deletingSavedGame.id));

      if (storedGameId === deletingSavedGame.id) {
        clearLottoGame();
        setStoredGameId(null);
      }

      if (game?.id === deletingSavedGame.id) {
        resetLottoPageState();
      }

      setDeletingSavedGame(null);
    } catch (error) {
      setSavedGamesError(getErrorMessage(error));
    } finally {
      setIsDeletingSavedGame(false);
    }
  }

  async function startGame() {
    if (!selectedConfig?.id || !selectedLottoRules || !canStartGame) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createLottoGameRequest({
        players: players.map((player) => ({
          nickname: player.nickname.trim(),
          cardNumbers: parseLottoNumbersInput(player.cardNumbers),
        })),
        configId: selectedConfig.id,
        djName: djName.trim(),
      });

      setGame(nextGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsStartingGame(false);
    }
  }

  function restartGame() {
    setRequestError(null);
    setIsResettingGame(true);
    resetLottoPageState();
    setIsResettingGame(false);
  }

  function addPlayerField() {
    setPlayers((current) => [...current, createEmptyPlayerInput()]);
  }

  function changePlayerName(index: number, value: string) {
    setPlayers((current) => current.map((player, playerIndex) => (playerIndex === index ? { ...player, nickname: value } : player)));
  }

  function changePlayerNumbers(index: number, value: string) {
    setPlayers((current) => current.map((player, playerIndex) => (playerIndex === index ? { ...player, cardNumbers: value } : player)));
  }

  function removePlayerField(index: number) {
    setPlayers((current) => {
      if (current.length === 1) {
        return [createEmptyPlayerInput()];
      }

      return current.filter((_, playerIndex) => playerIndex !== index);
    });
  }

  function generatePlayerCard(index: number) {
    if (!resolvedRules) {
      return;
    }

    const generatedNumbers = generateLottoCardNumbers(resolvedRules).join(", ");
    setPlayers((current) =>
      current.map((player, playerIndex) => (playerIndex === index ? { ...player, cardNumbers: generatedNumbers } : player)),
    );
  }

  async function drawNextNumber() {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setIsDrawingNumber(true);

    try {
      const nextGame = await drawLottoNumberRequest(game.id);
      setGame(nextGame);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsDrawingNumber(false);
    }
  }

  function requestRemovePlayerFromGame(player: LottoPlayer) {
    setPlayerPendingRemoval(player);
  }

  function cancelRemovePlayerFromGame() {
    if (removingPlayerId) {
      return;
    }

    setPlayerPendingRemoval(null);
  }

  async function confirmRemovePlayerFromGame() {
    if (!game?.id || !playerPendingRemoval) {
      return;
    }

    setRequestError(null);
    setRemovingPlayerId(playerPendingRemoval.id);

    try {
      const nextGame = await removeLottoPlayerRequest(game.id, playerPendingRemoval.id);
      setGame(nextGame);
      setPlayerPendingRemoval(null);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setRemovingPlayerId(null);
    }
  }

  async function copyPlayerCardNumbers(player: LottoPlayer) {
    try {
      await navigator.clipboard.writeText(player.cardNumbers.join(", "));
    } catch (error) {
      console.error("Failed to copy Lotto card numbers", error);
    }
  }

  return {
    game,
    players,
    playerErrors,
    savedGames,
    storedGameId,
    deletingSavedGame,
    playerPendingRemoval,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    selectedLottoRules,
    resolvedRules,
    resolvedCurrency,
    canStartGame,
    gameIsOver,
    pageStatusChips,
    headerActionsDisabled,
    boardActionsDisabled,
    setupActionsDisabled,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isDeletingSavedGame,
      isResettingGame,
      isDrawingNumber,
      removingPlayerId,
    },
    actions: {
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
      addPlayerField,
      changePlayerName,
      changePlayerNumbers,
      removePlayerField,
      generatePlayerCard,
      drawNextNumber,
      requestRemovePlayerFromGame,
      cancelRemovePlayerFromGame,
      confirmRemovePlayerFromGame,
      copyPlayerCardNumbers,
    },
  };
}
