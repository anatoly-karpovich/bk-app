import { normalizeBattleshipsRules } from "../../battleships/domain/config";
import { normalizeJourneyRules } from "../../journey/domain/config";
import { normalizeLottoRules } from "../../lotto/domain/config";
import type { AppConfig, AppConfigMutationInput, ConfigCurrency } from "./types";

const DEFAULT_CURRENCY_ID = "default";
const DEFAULT_CURRENCY_LABEL = "фишек";

export function normalizeConfigCurrencies(currencies: Array<Partial<ConfigCurrency>>): ConfigCurrency[] {
  return currencies
    .map((currency, index) => {
      const fallbackId = index === 0 ? DEFAULT_CURRENCY_ID : `${DEFAULT_CURRENCY_ID}_${index + 1}`;
      const normalizedId = currency.id?.trim() || fallbackId;
      const normalizedLabel = currency.label?.trim() || normalizedId;

      return {
        ...currency,
        id: normalizedId,
        label: normalizedLabel,
      };
    })
    .filter((currency, index, items) => items.findIndex((item) => item.id === currency.id) === index);
}

export function createDefaultConfigCurrency(label = DEFAULT_CURRENCY_LABEL): ConfigCurrency {
  return {
    id: DEFAULT_CURRENCY_ID,
    label: label.trim() || DEFAULT_CURRENCY_LABEL,
  };
}

export function getPrimaryCurrencyLabel(currencies: ConfigCurrency[]): string {
  return currencies[0]?.label ?? DEFAULT_CURRENCY_LABEL;
}

export function normalizeAppConfigInput(input: AppConfigMutationInput): Omit<AppConfig, "createdAt" | "updatedAt"> {
  const currencies = normalizeConfigCurrencies(input.currencies);
  const journeyRules = normalizeJourneyRules(input.games.journey);
  const battleshipsRules = normalizeBattleshipsRules(input.games.battleships);
  const lottoRules = normalizeLottoRules(input.games.lotto);

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    currencies,
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
  input: Omit<AppConfig, "createdAt" | "updatedAt"> &
    Partial<Pick<AppConfig, "createdAt" | "updatedAt">>,
  fallbackTimestamp: string,
): AppConfig {
  const normalized = normalizeAppConfigInput({
    name: input.name,
    description: input.description,
    currencies: input.currencies,
    games: input.games,
  });
  const createdAt = input.createdAt?.trim() || fallbackTimestamp;
  const updatedAt = input.updatedAt?.trim() || createdAt;

  return {
    ...normalized,
    createdAt,
    updatedAt,
  };
}
