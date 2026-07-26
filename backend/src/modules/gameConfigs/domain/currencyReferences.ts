export function collectCurrencyIdsFromRules(rules: unknown): Set<string> {
  const currencyIds = new Set<string>();
  const visited = new Set<unknown>();

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }

    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.currencyId === "string") {
      currencyIds.add(record.currencyId);
    }

    Object.values(record).forEach(visit);
  };

  visit(rules);
  return currencyIds;
}
