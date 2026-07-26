export interface CurrencySnapshot {
  id: string;
  label: string;
  code?: string;
  name?: string;
  shortLabel?: string;
  valueType?: "integer" | "decimal";
  precision?: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_CURRENCY_ID = "default";
const DEFAULT_CURRENCY_LABEL = "фишек";

export function normalizeCurrencySnapshots(currencies: Array<Partial<CurrencySnapshot>>): CurrencySnapshot[] {
  return currencies
    .map((currency, index) => {
      const fallbackId = index === 0 ? DEFAULT_CURRENCY_ID : `${DEFAULT_CURRENCY_ID}_${index + 1}`;
      const id = currency.id?.trim() || fallbackId;

      return {
        ...currency,
        id,
        label: currency.label?.trim() || id,
      };
    })
    .filter((currency, index, items) => items.findIndex((item) => item.id === currency.id) === index);
}

export function createDefaultCurrencySnapshot(label = DEFAULT_CURRENCY_LABEL): CurrencySnapshot {
  return {
    id: DEFAULT_CURRENCY_ID,
    label: label.trim() || DEFAULT_CURRENCY_LABEL,
  };
}
