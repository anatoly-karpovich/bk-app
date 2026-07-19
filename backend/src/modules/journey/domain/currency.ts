import type { CurrencySnapshot as ConfigCurrency } from "../../../common/currency";
import type { JourneyBalance, JourneyCurrencyValue } from "./types";

function getCurrencyOrder(currencies: ConfigCurrency[]): string[] {
  return currencies.map((currency) => currency.id);
}

export function createJourneyBalance(
  currencies: ConfigCurrency[],
  values: JourneyCurrencyValue[] = [],
): JourneyBalance {
  const initialBalance = currencies.reduce<JourneyBalance>((result, currency) => {
    result[currency.id] = 0;
    return result;
  }, {});

  values.forEach((entry) => {
    initialBalance[entry.currencyId] = (initialBalance[entry.currencyId] ?? 0) + Math.trunc(entry.value);
  });

  return initialBalance;
}

export function normalizeJourneyBalance(balance: JourneyBalance, currencies: ConfigCurrency[]): JourneyBalance {
  const normalizedBalance = createJourneyBalance(currencies);

  Object.entries(balance).forEach(([currencyId, value]) => {
    normalizedBalance[currencyId] = Math.max(0, Math.trunc(value));
  });

  return normalizedBalance;
}

export function balanceToJourneyCurrencyValues(
  balance: JourneyBalance,
  currencies: ConfigCurrency[],
): JourneyCurrencyValue[] {
  return getCurrencyOrder(currencies).map((currencyId) => ({
    currencyId,
    value: Math.trunc(balance[currencyId] ?? 0),
  }));
}

export function normalizeJourneyCurrencyValues(values: JourneyCurrencyValue[]): JourneyCurrencyValue[] {
  const grouped = values.reduce<Map<string, number>>((result, value) => {
    const currencyId = value.currencyId.trim();

    if (!currencyId) {
      return result;
    }

    result.set(currencyId, (result.get(currencyId) ?? 0) + Math.trunc(value.value));
    return result;
  }, new Map<string, number>());

  return Array.from(grouped.entries()).map(([currencyId, value]) => ({
    currencyId,
    value,
  }));
}

export function formatJourneyCurrencyValues(
  values: JourneyCurrencyValue[],
  currencies: ConfigCurrency[],
  options: {
    showPlus?: boolean;
    includeZero?: boolean;
  } = {},
): string {
  const { showPlus = false, includeZero = true } = options;
  const valuesByCurrencyId = new Map(normalizeJourneyCurrencyValues(values).map((value) => [value.currencyId, value.value]));

  return currencies
    .map((currency) => ({
      currency,
      value: Math.trunc(valuesByCurrencyId.get(currency.id) ?? 0),
    }))
    .filter(({ value }) => includeZero || value !== 0)
    .map(({ currency, value }) => `${showPlus && value > 0 ? "+" : ""}${value} ${currency.label}`)
    .join(", ");
}

export function hasPositiveJourneyRewards(values: JourneyCurrencyValue[]): boolean {
  return values.some((value) => value.value > 0);
}

export function hasNegativeJourneyRewards(values: JourneyCurrencyValue[]): boolean {
  return values.some((value) => value.value < 0);
}

export function applyJourneyRewardsToBalance(params: {
  balance: JourneyBalance;
  rewards: JourneyCurrencyValue[];
  currencies: ConfigCurrency[];
  maxPrizes: JourneyCurrencyValue[] | null;
}): {
  nextBalance: JourneyBalance;
  appliedRewards: JourneyCurrencyValue[];
  changedCurrenciesCount: number;
  hasAnyCappedPositiveReward: boolean;
  hasAnyBlockedPositiveReward: boolean;
  hasAnyFlooredNegativeReward: boolean;
  hasAnyBlockedNegativeReward: boolean;
} {
  const { balance, rewards, currencies, maxPrizes } = params;
  const nextBalance = normalizeJourneyBalance(balance, currencies);
  const normalizedRewards = normalizeJourneyCurrencyValues(rewards);
  const maxByCurrencyId = new Map((maxPrizes ?? []).map((value) => [value.currencyId, Math.max(0, Math.trunc(value.value))]));
  const appliedRewards: JourneyCurrencyValue[] = [];
  let changedCurrenciesCount = 0;
  let hasAnyCappedPositiveReward = false;
  let hasAnyBlockedPositiveReward = false;
  let hasAnyFlooredNegativeReward = false;
  let hasAnyBlockedNegativeReward = false;

  normalizedRewards.forEach((reward) => {
    const currentValue = nextBalance[reward.currencyId] ?? 0;

    if (reward.value > 0) {
      const maxValue = maxByCurrencyId.get(reward.currencyId);
      const nextValue =
        maxValue === undefined ? currentValue + reward.value : Math.min(maxValue, currentValue + reward.value);
      const appliedValue = nextValue - currentValue;

      if (appliedValue === 0) {
        hasAnyBlockedPositiveReward = true;
      } else if (appliedValue !== reward.value) {
        hasAnyCappedPositiveReward = true;
      }

      nextBalance[reward.currencyId] = nextValue;
      appliedRewards.push({ currencyId: reward.currencyId, value: appliedValue });

      if (appliedValue !== 0) {
        changedCurrenciesCount += 1;
      }

      return;
    }

    if (reward.value < 0) {
      const nextValue = Math.max(0, currentValue + reward.value);
      const appliedValue = nextValue - currentValue;

      if (appliedValue === 0) {
        hasAnyBlockedNegativeReward = true;
      } else if (appliedValue !== reward.value) {
        hasAnyFlooredNegativeReward = true;
      }

      nextBalance[reward.currencyId] = nextValue;
      appliedRewards.push({ currencyId: reward.currencyId, value: appliedValue });

      if (appliedValue !== 0) {
        changedCurrenciesCount += 1;
      }
    }
  });

  return {
    nextBalance,
    appliedRewards: normalizeJourneyCurrencyValues(appliedRewards),
    changedCurrenciesCount,
    hasAnyCappedPositiveReward,
    hasAnyBlockedPositiveReward,
    hasAnyFlooredNegativeReward,
    hasAnyBlockedNegativeReward,
  };
}
