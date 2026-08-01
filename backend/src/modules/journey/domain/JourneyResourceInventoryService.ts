import type { ApplyRewardsResult, ResourceAmount, ResourceHoldings, ResourceLimit } from "../../rewards";

/** Applies Journey's resource-limit rules to the resources granted by a reward pool. */
export class JourneyResourceInventoryService {
  apply(
    currentHoldings: Readonly<ResourceHoldings>,
    grantedRewards: readonly ResourceAmount[],
    limits: readonly ResourceLimit[] = [],
  ): ApplyRewardsResult {
    const holdings: ResourceHoldings = { ...currentHoldings };
    const limitsByResourceId = new Map(limits.map((limit) => [limit.resourceId, limit]));
    const rewards = grantedRewards.map((granted) => {
      const current = holdings[granted.resourceId] ?? 0;
      const limit = limitsByResourceId.get(granted.resourceId);
      let next = current + granted.amount;
      next = Math.max(limit?.min ?? 0, next);
      if (limit?.max !== undefined) next = Math.min(limit.max, next);
      holdings[granted.resourceId] = next;

      return {
        requested: { ...granted },
        applied: { resourceId: granted.resourceId, amount: next - current },
      };
    });

    return { holdings, rewards };
  }
}
