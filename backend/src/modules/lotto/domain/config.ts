import type { LottoRules, LottoRulesInput } from "./types";

export const DEFAULT_LOTTO_RULES: LottoRules = {
  min: 1,
  max: 50,
  cardNumbersAmount: 10,
  firstPlacePrize: 10,
  secondPlacePrize: 5,
  otherActivePlayersPrize: 0,
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
      Math.min(rangeSize, normalizeInteger(input.cardNumbersAmount ?? DEFAULT_LOTTO_RULES.cardNumbersAmount, DEFAULT_LOTTO_RULES.cardNumbersAmount)),
    ),
    firstPlacePrize: normalizeNonNegativeInteger(input.firstPlacePrize ?? DEFAULT_LOTTO_RULES.firstPlacePrize),
    secondPlacePrize: normalizeNonNegativeInteger(input.secondPlacePrize ?? DEFAULT_LOTTO_RULES.secondPlacePrize),
    otherActivePlayersPrize: normalizeNonNegativeInteger(
      input.otherActivePlayersPrize ?? DEFAULT_LOTTO_RULES.otherActivePlayersPrize,
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
  if (!Number.isFinite(value)) {
    return Math.trunc(fallbackValue);
  }

  return Math.trunc(value);
}

function normalizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}
