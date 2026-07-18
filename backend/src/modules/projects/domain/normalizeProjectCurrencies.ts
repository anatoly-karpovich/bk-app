import type { ProjectCurrency } from "./types";

export function normalizeProjectCurrencies(
  currencies: Array<Partial<ProjectCurrency>>,
  timestamp = new Date().toISOString(),
): ProjectCurrency[] {
  const ids = new Set<string>();
  const codes = new Set<string>();

  return currencies.map((currency, index) => {
    const id = currency.id?.trim() || `currency_${index + 1}`;
    const code = currency.code?.trim() || id;
    const label = currency.label?.trim() || currency.name?.trim() || code;
    const name = currency.name?.trim() || label;
    const precision = Math.max(0, Math.min(8, Math.trunc(currency.precision ?? 0)));
    const valueType = currency.valueType === "decimal" ? "decimal" : "integer";

    if (ids.has(id) || codes.has(code)) {
      throw new Error(`Project currencies must have unique id and code: ${id}`);
    }

    ids.add(id);
    codes.add(code);

    return {
      id,
      code,
      name,
      label,
      shortLabel: currency.shortLabel?.trim() || undefined,
      valueType,
      precision,
      createdAt: currency.createdAt || timestamp,
      updatedAt: timestamp,
    };
  });
}
