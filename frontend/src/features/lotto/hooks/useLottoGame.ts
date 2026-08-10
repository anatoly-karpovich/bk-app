import { useEffect, useMemo, useState } from "react";
import { useGameRoute } from "../../../hooks/useGameRoute";
import { getLottoGameConfigsRequest, getSelectedGameConfigStorageKey } from "../../projects/api/projects.client";
import { loadSelectedGameConfigId, saveSelectedGameConfigId } from "../../projects/storage";
import type { LottoGameConfig, Project } from "../../projects/types";
import {
  createLottoGameRequest,
  deleteLottoGameRequest,
  drawLottoNumberRequest,
  getLottoGameByIdRequest,
  listLottoGamesRequest,
  removeLottoPlayerRequest,
} from "../api/lotto.client";
import {
  createLottoStatusChips,
  generateLottoCardNumbers,
  parseLottoNumbersInput,
  validateLottoCardNumbers,
} from "../mappers/lotto.mapper";
import type {
  LottoPersistedGame,
  LottoPlayer,
  LottoSavedGameSummary,
  LottoSetupPlayerInput,
  LottoSetupPlayerInputError,
} from "../types";

interface UseLottoGameParams {
  djName: string;
  selectedProject: Project | null;
}

const LOTTO_GAME_CONFIG_STORAGE_KEY = getSelectedGameConfigStorageKey("lotto");
const SAVED_GAME_PROJECT_MISMATCH_ERROR = "Saved game belongs to another project.";

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
  selectedGameConfig: LottoGameConfig | null,
): LottoSetupPlayerInputError[] {
  const rules = game?.rules ?? selectedGameConfig?.rules ?? null;
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

function resolveSelectedGameConfigId(gameConfigs: LottoGameConfig[]) {
  const storedGameConfigId = loadSelectedGameConfigId(LOTTO_GAME_CONFIG_STORAGE_KEY);
  const fallbackGameConfigId = gameConfigs[0]?.id ?? "";

  return (
    (storedGameConfigId &&
      gameConfigs.some((gameConfig) => gameConfig.id === storedGameConfigId) &&
      storedGameConfigId) ||
    fallbackGameConfigId
  );
}

export function useLottoGame({ djName, selectedProject }: UseLottoGameParams) {
  const { gameId, openGame, openSetup } = useGameRoute("/lotto");
  const [game, setGame] = useState<LottoPersistedGame | null>(null);
  const [players, setPlayers] = useState<LottoSetupPlayerInput[]>([createEmptyPlayerInput()]);
  const [savedGames, setSavedGames] = useState<LottoSavedGameSummary[]>([]);
  const [savedGamesDialogOpen, setSavedGamesDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [savedGamesError, setSavedGamesError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [gameConfigsError, setGameConfigsError] = useState<string | null>(null);
  const [gameConfigs, setGameConfigs] = useState<LottoGameConfig[]>([]);
  const [selectedGameConfigId, setSelectedGameConfigId] = useState(
    () => loadSelectedGameConfigId(LOTTO_GAME_CONFIG_STORAGE_KEY) ?? "",
  );
  const [deletingSavedGame, setDeletingSavedGame] = useState<LottoSavedGameSummary | null>(null);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<LottoPlayer | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isRestoringGame, setIsRestoringGame] = useState(false);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isLoadingGameConfigs, setIsLoadingGameConfigs] = useState(false);
  const [isDeletingSavedGame, setIsDeletingSavedGame] = useState(false);
  const [isRefreshingGame, setIsRefreshingGame] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [isDrawingNumber, setIsDrawingNumber] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

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
        const nextGameConfigs = await getLottoGameConfigsRequest(selectedProject.id);

        if (cancelled) {
          return;
        }

        const resolvedGameConfigId = resolveSelectedGameConfigId(nextGameConfigs);
        setGameConfigs(nextGameConfigs);
        setSelectedGameConfigId(resolvedGameConfigId);

        if (resolvedGameConfigId) {
          saveSelectedGameConfigId(LOTTO_GAME_CONFIG_STORAGE_KEY, resolvedGameConfigId);
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
        resetLottoPageState();
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
        const restoredGame = await getLottoGameByIdRequest(selectedProject.id, gameId);

        if (cancelled) {
          return;
        }

        if (restoredGame.projectId !== selectedProject.id) {
          setRequestError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
          openSetup({ replace: true });
          return;
        }

        setGame(restoredGame);
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
      resetLottoPageState();
      openSetup({ replace: true });
    }
  }, [game, openSetup, selectedProject?.id]);

  const selectedLottoGameConfig = useMemo(
    () => gameConfigs.find((gameConfig) => gameConfig.id === selectedGameConfigId) ?? null,
    [gameConfigs, selectedGameConfigId],
  );
  const selectedLottoRules = selectedLottoGameConfig?.rules ?? null;
  const resolvedRules = game?.rules ?? selectedLottoRules ?? null;
  const resolvedResources = game?.resources ?? selectedProject?.resources ?? [];
  const playerErrors = useMemo(
    () => getPlayerSetupErrors(players, game, selectedLottoGameConfig),
    [game, players, selectedLottoGameConfig],
  );
  const canStartGame =
    Boolean(selectedProject?.id) &&
    Boolean(selectedLottoGameConfig) &&
    playerErrors.length > 0 &&
    playerErrors.every((error) => !error.nickname && !error.cardNumbers);
  const pageStatusChips = useMemo(
    () =>
      createLottoStatusChips({
        game,
        djName,
        selectedGameConfigName: selectedLottoGameConfig?.name,
      }),
    [djName, game, selectedLottoGameConfig?.name],
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
      isDrawingNumber ||
      Boolean(removingPlayerId),
    [
      isDeletingSavedGame,
      isDrawingNumber,
      isLoadingGameConfigs,
      isLoadingSavedGames,
      isRefreshingGame,
      isResettingGame,
      isRestoringGame,
      isStartingGame,
      removingPlayerId,
    ],
  );
  const boardActionsDisabled = useMemo(
    () => isDrawingNumber || isRestoringGame || isResettingGame || Boolean(removingPlayerId),
    [isDrawingNumber, isResettingGame, isRestoringGame, removingPlayerId],
  );
  const setupActionsDisabled = useMemo(
    () => isStartingGame || isLoadingGameConfigs || isRestoringGame || isResettingGame,
    [isLoadingGameConfigs, isResettingGame, isRestoringGame, isStartingGame],
  );

  function resetLottoPageState() {
    setGame(null);
    setPlayers([createEmptyPlayerInput()]);
  }

  function selectGameConfig(nextGameConfigId: string) {
    setSelectedGameConfigId(nextGameConfigId);
    saveSelectedGameConfigId(LOTTO_GAME_CONFIG_STORAGE_KEY, nextGameConfigId);
  }

  async function loadSavedGames() {
    setSavedGamesError(null);
    setIsLoadingSavedGames(true);

    try {
      const filteredSavedGames = selectedProject?.id ? await listLottoGamesRequest(selectedProject.id) : [];

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
      const restoredGame = await getLottoGameByIdRequest(selectedProject.id, gameId);

      if (selectedProject?.id && restoredGame.projectId !== selectedProject.id) {
        setSavedGamesError(SAVED_GAME_PROJECT_MISMATCH_ERROR);
        return;
      }

      setGame(restoredGame);
      setSavedGamesDialogOpen(false);
      openGame(restoredGame.id);

      if (gameConfigs.some((gameConfig) => gameConfig.id === restoredGame.configId)) {
        setSelectedGameConfigId(restoredGame.configId);
        saveSelectedGameConfigId(LOTTO_GAME_CONFIG_STORAGE_KEY, restoredGame.configId);
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
      const refreshedGame = await getLottoGameByIdRequest(selectedProject.id, game.id);

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
      await deleteLottoGameRequest(deletingSavedGame.projectId, deletingSavedGame.id);
      setSavedGames((current) => current.filter((gameItem) => gameItem.id !== deletingSavedGame.id));

      if (game?.id === deletingSavedGame.id) {
        resetLottoPageState();
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
    if (!selectedProject?.id || !selectedLottoGameConfig || !selectedLottoRules || !canStartGame) {
      return;
    }

    setRequestError(null);
    setIsStartingGame(true);

    try {
      const nextGame = await createLottoGameRequest({
        projectId: selectedProject.id,
        players: players.map((player) => ({
          nickname: player.nickname.trim(),
          cardNumbers: parseLottoNumbersInput(player.cardNumbers),
        })),
        gameConfigId: selectedLottoGameConfig.id,
      });

      setGame(nextGame);
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
    resetLottoPageState();
    openSetup();
    setIsResettingGame(false);
  }

  function addPlayerField() {
    setPlayers((current) => [...current, createEmptyPlayerInput()]);
  }

  function changePlayerName(index: number, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) => (playerIndex === index ? { ...player, nickname: value } : player)),
    );
  }

  function changePlayerNumbers(index: number, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) => (playerIndex === index ? { ...player, cardNumbers: value } : player)),
    );
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
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, cardNumbers: generatedNumbers } : player,
      ),
    );
  }

  async function drawNextNumber() {
    if (!game?.id) {
      return;
    }

    setRequestError(null);
    setIsDrawingNumber(true);

    try {
      const nextGame = await drawLottoNumberRequest(game.projectId, game.id);
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
      const nextGame = await removeLottoPlayerRequest(game.projectId, game.id, playerPendingRemoval.id);
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
    gameConfigs,
    selectedGameConfigId,
    players,
    playerErrors,
    savedGames,
    currentGameId: game?.id ?? null,
    deletingSavedGame,
    playerPendingRemoval,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    gameConfigsError,
    selectedLottoRules,
    resolvedRules,
    resolvedResources,
    canStartGame,
    headerActionsDisabled,
    boardActionsDisabled,
    setupActionsDisabled,
    pageStatusChips,
    loading: {
      isStartingGame,
      isRestoringGame,
      isLoadingSavedGames,
      isLoadingGameConfigs,
      isDeletingSavedGame,
      isRefreshingGame,
      isResettingGame,
      isDrawingNumber,
      removingPlayerId,
    },
    actions: {
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
