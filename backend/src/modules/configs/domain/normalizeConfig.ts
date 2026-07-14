import { normalizeBattleshipsRules } from "../../battleships/domain/config";
import { normalizeJourneyRules } from "../../journey/domain/config";
import { normalizeLottoRules } from "../../lotto/domain/config";
import type { AppConfig, AppConfigMutationInput } from "./types";

function syncBattleshipsCurrency(
  currency: string,
  rules: ReturnType<typeof normalizeBattleshipsRules>,
) {
  return {
    ...rules,
    boards: Object.fromEntries(
      Object.entries(rules.boards).map(([boardKey, boardConfig]) => [
        boardKey,
        {
          ...boardConfig,
          currency,
        },
      ]),
    ),
  };
}

export function normalizeAppConfigInput(input: AppConfigMutationInput): Omit<AppConfig, "createdAt" | "updatedAt"> {
  const currency = input.currency.trim();
  const journeyRules = normalizeJourneyRules({
    ...input.games.journey,
    currency,
  });
  const battleshipsRules = syncBattleshipsCurrency(
    currency,
    normalizeBattleshipsRules(input.games.battleships),
  );
  const lottoRules = normalizeLottoRules(input.games.lotto);

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    currency,
    games: {
      journey: journeyRules,
      battleships: battleshipsRules,
      lotto: lottoRules,
    },
  };
}

export function buildPersistedAppConfig(input: AppConfigMutationInput, timestamp = new Date().toISOString()): AppConfig {
  const normalized = normalizeAppConfigInput(input);

  return {
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeStoredAppConfig(
  input: AppConfigMutationInput & Partial<Pick<AppConfig, "createdAt" | "updatedAt">>,
  fallbackTimestamp: string,
): AppConfig {
  const normalized = normalizeAppConfigInput(input);
  const createdAt = input.createdAt?.trim() || fallbackTimestamp;
  const updatedAt = input.updatedAt?.trim() || createdAt;

  return {
    ...normalized,
    createdAt,
    updatedAt,
  };
}
