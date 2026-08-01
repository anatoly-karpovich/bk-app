import type { ResourceAmount } from "./reward.types";

export function normalizeResourceAmounts(values: readonly ResourceAmount[]): ResourceAmount[] {
  const amounts = new Map<string, number>();

  values.forEach((value) => {
    const resourceId = value.resourceId.trim();
    if (!resourceId || !Number.isFinite(value.amount)) return;
    amounts.set(resourceId, (amounts.get(resourceId) ?? 0) + value.amount);
  });

  return Array.from(amounts.entries())
    .filter(([, amount]) => amount !== 0)
    .map(([resourceId, amount]) => ({ resourceId, amount }));
}

export function addResourceAmounts(...values: ReadonlyArray<readonly ResourceAmount[]>): ResourceAmount[] {
  return normalizeResourceAmounts(values.flat());
}
