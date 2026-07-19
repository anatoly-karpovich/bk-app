import type { CurrencySnapshot } from "./currency";

export interface CurrencyValue {
  currencyId: string;
  value: number;
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

export function normalizeCurrencyValues(values: CurrencyValue[]): CurrencyValue[] {
  const grouped = values.reduce<Map<string, number>>((result, entry) => {
    const currencyId = entry.currencyId.trim();

    if (!currencyId) {
      return result;
    }

    result.set(currencyId, normalizeNumber((result.get(currencyId) ?? 0) + entry.value));
    return result;
  }, new Map<string, number>());

  return Array.from(grouped.entries()).map(([currencyId, value]) => ({
    currencyId,
    value: normalizeNumber(value),
  }));
}

export function hasAnyNonZeroCurrencyValues(values: CurrencyValue[]): boolean {
  return normalizeCurrencyValues(values).some((entry) => entry.value !== 0);
}

export function addCurrencyValues(...sets: CurrencyValue[][]): CurrencyValue[] {
  return normalizeCurrencyValues(sets.flat());
}

export function divideCurrencyValues(values: CurrencyValue[], divisor: number): CurrencyValue[] {
  if (!Number.isFinite(divisor) || divisor <= 0) {
    return normalizeCurrencyValues(values);
  }

  return normalizeCurrencyValues(
    values.map((entry) => ({
      currencyId: entry.currencyId,
      value: normalizeNumber(entry.value / divisor),
    })),
  );
}

export function formatCurrencyNumber(value: number): string {
  const normalized = normalizeNumber(value);

  if (Number.isInteger(normalized)) {
    return String(normalized);
  }

  return normalized.toFixed(2).replace(/\.?0+$/, "");
}

export function formatCurrencyValues(
  values: CurrencyValue[],
  currencies: CurrencySnapshot[],
  options: {
    showPlus?: boolean;
    includeZero?: boolean;
    absolute?: boolean;
  } = {},
): string {
  const { showPlus = false, includeZero = true, absolute = false } = options;
  const normalizedValues = normalizeCurrencyValues(values);
  const valuesByCurrencyId = new Map(
    normalizedValues.map((entry) => [entry.currencyId, absolute ? Math.abs(entry.value) : entry.value]),
  );
  const orderedCurrencyIds = currencies.map((currency) => currency.id);
  const unknownCurrencyIds = normalizedValues
    .map((entry) => entry.currencyId)
    .filter((currencyId) => !orderedCurrencyIds.includes(currencyId));

  return [...orderedCurrencyIds, ...unknownCurrencyIds]
    .map((currencyId) => {
      const value = normalizeNumber(valuesByCurrencyId.get(currencyId) ?? 0);

      if (!includeZero && value === 0) {
        return null;
      }

      const label = currencies.find((currency) => currency.id === currencyId)?.label ?? currencyId;
      return `${showPlus && value > 0 ? "+" : ""}${formatCurrencyNumber(value)} ${label}`;
    })
    .filter((value): value is string => Boolean(value))
    .join(", ");
}
