import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../lib/apiClient";
import { getLottoBingoGameConfigsRequest, getSelectedGameConfigStorageKey } from "../../projects/api/projects.client";
import { loadSelectedGameConfigId, saveSelectedGameConfigId } from "../../projects/storage";
import type { LottoBingoGameConfig, Project } from "../../projects/types";
import { lottoBingoApi } from "../api/lottoBingo.client";
import { clearLottoBingoGameId, loadLottoBingoGameId, saveLottoBingoGameId } from "../storage";
import type { LottoBingoPageModel, LottoBingoSavedGame, LottoBingoPlayer } from "../types";

interface UseLottoBingoGameParams { selectedProject: Project | null; }
const configStorageKey = getSelectedGameConfigStorageKey("lotto_bingo");
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function useLottoBingoGame({ selectedProject }: UseLottoBingoGameParams) {
  const [game, setGame] = useState<LottoBingoPageModel | null>(null);
  const [configs, setConfigs] = useState<LottoBingoGameConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState(() => loadSelectedGameConfigId(configStorageKey) ?? "");
  const [savedGames, setSavedGames] = useState<LottoBingoSavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observing, setObserving] = useState(false);
  const observerRef = useRef<EventSource | null>(null);

  const applyGame = useCallback((next: LottoBingoPageModel | null) => {
    setGame(next);
    if (next) saveLottoBingoGameId(next.id);
    else clearLottoBingoGameId();
  }, []);

  const reload = useCallback(async (gameId = game?.id) => {
    if (!selectedProject?.id || !gameId) return null;
    const current = await lottoBingoApi.get(selectedProject.id, gameId);
    applyGame(current);
    return current;
  }, [applyGame, game?.id, selectedProject?.id]);

  const loadInitial = useCallback(async () => {
    if (!selectedProject?.id) { setConfigs([]); applyGame(null); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const nextConfigs = await getLottoBingoGameConfigsRequest(selectedProject.id);
      setConfigs(nextConfigs);
      setSelectedConfigId((current) => nextConfigs.some((config) => config.id === current) ? current : (nextConfigs[0]?.id ?? ""));
      const storedId = loadLottoBingoGameId();
      if (storedId) {
        try { applyGame(await lottoBingoApi.get(selectedProject.id, storedId)); }
        catch { clearLottoBingoGameId(); applyGame(null); }
      } else {
        try { applyGame(await lottoBingoApi.latest(selectedProject.id)); }
        catch (cause) { if (!(cause instanceof ApiError && cause.status === 404)) throw cause; applyGame(null); }
      }
    } catch (cause) {
      setError(errorMessage(cause, "Не удалось загрузить Лото Бинго."));
    } finally { setLoading(false); }
  }, [applyGame, selectedProject?.id]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  useEffect(() => () => observerRef.current?.close(), []);

  const runMutation = useCallback(async (operation: (current: LottoBingoPageModel) => Promise<LottoBingoPageModel>) => {
    if (!game) return null;
    setBusy(true); setError(null);
    try {
      const updated = await operation(game);
      applyGame(updated);
      return updated;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        try { await reload(game.id); setError("Игра изменилась в другой вкладке. Загружена актуальная версия."); }
        catch (reloadCause) { setError(errorMessage(reloadCause, "Не удалось обновить игру после конфликта.")); }
      } else setError(errorMessage(cause, "Не удалось выполнить действие."));
      return null;
    } finally { setBusy(false); }
  }, [applyGame, game, reload]);

  const loadSavedGames = useCallback(async () => {
    if (!selectedProject?.id) return [];
    try { const values = await lottoBingoApi.list(selectedProject.id); setSavedGames(values); return values; }
    catch (cause) { setError(errorMessage(cause, "Не удалось загрузить сохранённые игры.")); return []; }
  }, [selectedProject?.id]);

  const setConfig = (configId: string) => { setSelectedConfigId(configId); saveSelectedGameConfigId(configStorageKey, configId); };
  const createGame = async () => {
    if (!selectedProject?.id || !selectedConfigId) return null;
    setBusy(true); setError(null);
    try { const created = await lottoBingoApi.create(selectedProject.id, selectedConfigId); applyGame(created); return created; }
    catch (cause) { setError(errorMessage(cause, "Не удалось создать игру.")); return null; }
    finally { setBusy(false); }
  };
  const restoreGame = async (gameId: string) => {
    if (!selectedProject?.id) return null;
    setBusy(true); setError(null);
    try { const restored = await lottoBingoApi.get(selectedProject.id, gameId); applyGame(restored); return restored; }
    catch (cause) { setError(errorMessage(cause, "Не удалось восстановить игру.")); return null; }
    finally { setBusy(false); }
  };
  const deleteGame = async (gameId: string) => {
    if (!selectedProject?.id) return false;
    setBusy(true); setError(null);
    try {
      const current = game?.id === gameId ? game : await lottoBingoApi.get(selectedProject.id, gameId);
      await lottoBingoApi.delete(selectedProject.id, gameId, current.meta.revision);
      setSavedGames((values) => values.filter((item) => item.id !== gameId));
      if (game?.id === gameId) applyGame(null);
      return true;
    } catch (cause) { setError(errorMessage(cause, "Не удалось удалить игру.")); return false; }
    finally { setBusy(false); }
  };
  const setLiveObservation = (next: boolean) => {
    observerRef.current?.close(); observerRef.current = null; setObserving(next);
    if (!next || !selectedProject?.id || !game) return;
    const observer = new EventSource(lottoBingoApi.eventsUrl(selectedProject.id, game.id), { withCredentials: true });
    observer.addEventListener("lotto_bingo_updated", (event) => {
      try { const update = JSON.parse(event.data) as { gameId: string; revision: number }; if (update.gameId === game.id && update.revision > game.meta.revision) void reload(game.id); }
      catch { /* Ignore malformed invalidation events. */ }
    });
    observer.onerror = () => { observer.close(); setObserving(false); };
    observerRef.current = observer;
  };
  const resetUi = () => {
    observerRef.current?.close();
    observerRef.current = null;
    setObserving(false);
    setError(null);
    applyGame(null);
  };

  return {
    game, configs, selectedConfigId, savedGames, loading, busy, error, observing,
    actions: {
      setError, setConfig, createGame, reload: () => reload(), loadSavedGames, restoreGame, deleteGame, setLiveObservation, resetUi,
      addPlayer: (nickname: string) => runMutation((current) => lottoBingoApi.addPlayer(current.meta.projectId, current.id, nickname, current.meta.revision)),
      removePlayer: (player: LottoBingoPlayer) => runMutation((current) => lottoBingoApi.removePlayer(current.meta.projectId, current.id, player.id, current.meta.revision)),
      start: () => runMutation((current) => lottoBingoApi.start(current.meta.projectId, current.id, current.meta.revision)),
      draw: () => runMutation((current) => lottoBingoApi.draw(current.meta.projectId, current.id, current.meta.revision)),
      undo: () => runMutation((current) => lottoBingoApi.undo(current.meta.projectId, current.id, current.meta.revision)),
      confirmWinners: (playerIds: string[]) => runMutation((current) => lottoBingoApi.confirmWinners(current.meta.projectId, current.id, playerIds, current.meta.revision)),
      disqualify: (player: LottoBingoPlayer) => runMutation((current) => lottoBingoApi.disqualify(current.meta.projectId, current.id, player.id, current.meta.revision)),
      restore: (player: LottoBingoPlayer) => runMutation((current) => lottoBingoApi.restore(current.meta.projectId, current.id, player.id, current.meta.revision)),
      finalize: () => runMutation((current) => lottoBingoApi.finalize(current.meta.projectId, current.id, current.meta.revision)),
    },
  };
}
