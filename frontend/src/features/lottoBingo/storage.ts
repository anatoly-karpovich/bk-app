const GAME_STORAGE_KEY = "combats-dj:lotto-bingo-game-id";

export function loadLottoBingoGameId() { return localStorage.getItem(GAME_STORAGE_KEY); }
export function saveLottoBingoGameId(gameId: string) { localStorage.setItem(GAME_STORAGE_KEY, gameId); }
export function clearLottoBingoGameId() { localStorage.removeItem(GAME_STORAGE_KEY); }
