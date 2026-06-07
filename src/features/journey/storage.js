import { normalizeJourneyGame } from "./engine";

const STORAGE_KEY = "combats-dj:journey";

export function saveJourneyGame(game) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export function loadJourneyGame() {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return normalizeJourneyGame(JSON.parse(rawValue));
  } catch (error) {
    console.error("Failed to parse stored Journey game", error);
    return null;
  }
}

export function clearJourneyGame() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasStoredJourneyGame() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}
