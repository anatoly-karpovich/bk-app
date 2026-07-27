import type { ApplyRewardsResult, ResourceHoldings, ResourceLimit, ResourceAmount } from "../domain/reward.types";

export class ResourceInventoryService {
  apply(
    currentHoldings: Readonly<ResourceHoldings>,
    requestedRewards: readonly ResourceAmount[],
    limits: readonly ResourceLimit[] = [],
  ): ApplyRewardsResult {
    const holdings: ResourceHoldings = { ...currentHoldings };
    const limitsByResourceId = new Map(limits.map((limit) => [limit.resourceId, limit]));
    const rewards = requestedRewards.map((requested) => {
      const current = holdings[requested.resourceId] ?? 0;
      const limit = limitsByResourceId.get(requested.resourceId);
      let next = current + requested.amount;
      next = Math.max(limit?.min ?? 0, next);
      if (limit?.max !== undefined) next = Math.min(limit.max, next);
      holdings[requested.resourceId] = next;
      return { requested: { ...requested }, applied: { resourceId: requested.resourceId, amount: next - current } };
    });
    return { holdings, rewards };
  }
}
