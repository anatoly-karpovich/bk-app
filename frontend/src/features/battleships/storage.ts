const GAME_STORAGE_KEY = "combats-dj:battleships";

function readJsonStorage<T>(key: string, fallbackValue: T): T {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}"`, error);
    return fallbackValue;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveBattleshipsGameId(gameId: string) {
  writeJsonStorage(GAME_STORAGE_KEY, gameId);
}

export function loadBattleshipsGameId() {
  const storedValue = readJsonStorage<string | { id?: unknown } | null>(GAME_STORAGE_KEY, null);

  if (typeof storedValue === "string") {
    return storedValue;
  }

  if (storedValue && typeof storedValue === "object" && typeof storedValue.id === "string") {
    return storedValue.id;
  }

  return null;
}

export function clearBattleshipsGame() {
  localStorage.removeItem(GAME_STORAGE_KEY);
}
