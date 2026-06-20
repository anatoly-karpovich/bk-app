import {
  DEFAULT_JOURNEY_RULESET,
  getBuiltInJourneyRulesets,
  getJourneyRulesetById,
  normalizeJourneyRuleset,
} from "./config";
import { normalizeJourneyGame } from "./engine";

const GAME_STORAGE_KEY = "combats-dj:journey";
const RULESETS_STORAGE_KEY = "combats-dj:journey:rulesets";
const DEFAULT_RULESET_ID_STORAGE_KEY = "combats-dj:journey:default-ruleset-id";

function readJsonStorage(key, fallbackValue) {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}"`, error);
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredCustomJourneyRulesets() {
  const rawRulesets = readJsonStorage(RULESETS_STORAGE_KEY, []);

  if (!Array.isArray(rawRulesets)) {
    return [];
  }

  return rawRulesets.map((ruleset) => normalizeJourneyRuleset({ ...ruleset, isBuiltIn: false }));
}

function saveCustomJourneyRulesets(rulesets) {
  writeJsonStorage(
    RULESETS_STORAGE_KEY,
    rulesets.map((ruleset) => ({
      ...normalizeJourneyRuleset({ ...ruleset, isBuiltIn: false }),
      isBuiltIn: false,
    })),
  );
}

export function saveJourneyGame(game) {
  writeJsonStorage(GAME_STORAGE_KEY, game);
}

export function loadJourneyGame() {
  return normalizeJourneyGame(readJsonStorage(GAME_STORAGE_KEY, null));
}

export function clearJourneyGame() {
  localStorage.removeItem(GAME_STORAGE_KEY);
}

export function hasStoredJourneyGame() {
  return Boolean(localStorage.getItem(GAME_STORAGE_KEY));
}

export function loadJourneyRulesets() {
  const builtInRulesets = getBuiltInJourneyRulesets();
  const builtInIds = new Set(builtInRulesets.map((ruleset) => ruleset.id));
  const customRulesets = getStoredCustomJourneyRulesets().filter((ruleset) => !builtInIds.has(ruleset.id));

  return [...builtInRulesets, ...customRulesets];
}

export function loadDefaultJourneyRulesetId() {
  const storedRulesetId = localStorage.getItem(DEFAULT_RULESET_ID_STORAGE_KEY);
  const rulesets = loadJourneyRulesets();

  if (storedRulesetId && getJourneyRulesetById(storedRulesetId, rulesets)) {
    return storedRulesetId;
  }

  return DEFAULT_JOURNEY_RULESET.id;
}

export function saveDefaultJourneyRulesetId(rulesetId) {
  const rulesets = loadJourneyRulesets();
  const resolvedRulesetId = getJourneyRulesetById(rulesetId, rulesets)?.id ?? DEFAULT_JOURNEY_RULESET.id;
  localStorage.setItem(DEFAULT_RULESET_ID_STORAGE_KEY, resolvedRulesetId);
  return resolvedRulesetId;
}

export function loadDefaultJourneyRuleset() {
  const rulesets = loadJourneyRulesets();
  return getJourneyRulesetById(loadDefaultJourneyRulesetId(), rulesets) ?? normalizeJourneyRuleset(DEFAULT_JOURNEY_RULESET);
}

export function saveJourneyRuleset(ruleset) {
  const normalizedRuleset = normalizeJourneyRuleset({ ...ruleset, isBuiltIn: false });
  const nextRulesets = [
    ...getStoredCustomJourneyRulesets().filter((item) => item.id !== normalizedRuleset.id),
    normalizedRuleset,
  ];

  saveCustomJourneyRulesets(nextRulesets);
  return normalizedRuleset;
}

export function deleteJourneyRuleset(rulesetId) {
  saveCustomJourneyRulesets(getStoredCustomJourneyRulesets().filter((ruleset) => ruleset.id !== rulesetId));

  if (loadDefaultJourneyRulesetId() === rulesetId) {
    saveDefaultJourneyRulesetId(DEFAULT_JOURNEY_RULESET.id);
  }
}
