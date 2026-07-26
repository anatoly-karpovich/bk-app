import { normalizeCurrencyValues } from "../../../common/currencyValues";
import type { LottoCurrencyValue, LottoRules, LottoRulesInput } from "./types";

export const DEFAULT_LOTTO_RULES: LottoRules = {
  min: 1,
  max: 50,
  cardNumbersAmount: 10,
  firstPlacePrize: [{ currencyId: "default", value: 10 }],
  secondPlacePrize: [{ currencyId: "default", value: 5 }],
  otherActivePlayersPrize: [{ currencyId: "default", value: 0 }],
  rewardDistributionMode: "full_per_winner",
};

export function normalizeLottoRules(input: LottoRulesInput = {}): LottoRules {
  const min = normalizeInteger(input.min ?? DEFAULT_LOTTO_RULES.min, DEFAULT_LOTTO_RULES.min);
  const fallbackMax = Math.max(min, DEFAULT_LOTTO_RULES.max);
  const requestedMax = normalizeInteger(input.max ?? fallbackMax, fallbackMax);
  const max = Math.max(min, requestedMax);
  const rangeSize = Math.max(1, max - min + 1);

  return {
    min,
    max,
    cardNumbersAmount: Math.max(
      1,
      Math.min(
        rangeSize,
        normalizeInteger(input.cardNumbersAmount ?? DEFAULT_LOTTO_RULES.cardNumbersAmount, DEFAULT_LOTTO_RULES.cardNumbersAmount),
      ),
    ),
    firstPlacePrize: normalizePrizeValues(input.firstPlacePrize ?? DEFAULT_LOTTO_RULES.firstPlacePrize, DEFAULT_LOTTO_RULES.firstPlacePrize),
    secondPlacePrize: normalizePrizeValues(input.secondPlacePrize ?? DEFAULT_LOTTO_RULES.secondPlacePrize, DEFAULT_LOTTO_RULES.secondPlacePrize),
    otherActivePlayersPrize: normalizePrizeValues(
      input.otherActivePlayersPrize ?? DEFAULT_LOTTO_RULES.otherActivePlayersPrize,
      DEFAULT_LOTTO_RULES.otherActivePlayersPrize,
    ),
    rewardDistributionMode:
      input.rewardDistributionMode === "split_pool" ? "split_pool" : DEFAULT_LOTTO_RULES.rewardDistributionMode,
  };
}

export function getLottoRangeLabel(rules: LottoRules): string {
  const normalizedRules = normalizeLottoRules(rules);
  return `${normalizedRules.min}-${normalizedRules.max}`;
}

function normalizeInteger(value: number, fallbackValue: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return Math.trunc(fallbackValue);
  }

  return Math.trunc(numericValue);
}

function normalizeNonNegativeInteger(value: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numericValue));
}

function normalizePrizeValues(values: LottoCurrencyValue[], fallback: LottoCurrencyValue[]): LottoCurrencyValue[] {
  const normalizedValues = normalizeCurrencyValues(values).map((entry) => ({
    currencyId: entry.currencyId,
    value: normalizeNonNegativeInteger(entry.value),
  }));

  return normalizedValues.length ? normalizedValues : structuredClone(fallback);
}
