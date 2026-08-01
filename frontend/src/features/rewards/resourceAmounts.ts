import type { ResourceAmount, ResourceDefinition, RewardPool } from "./types";

export function formatResourceAmounts(values: readonly ResourceAmount[], resources: readonly ResourceDefinition[], options: { showPlus?: boolean } = {}): string {
  return values.map((value) => `${options.showPlus && value.amount > 0 ? "+" : ""}${value.amount} ${resources.find((resource) => resource.id === value.resourceId)?.unitLabel ?? resources.find((resource) => resource.id === value.resourceId)?.shortLabel ?? resources.find((resource) => resource.id === value.resourceId)?.label ?? value.resourceId}`).join(", ");
}

export function formatRewardPool(pool: RewardPool, resources: readonly ResourceDefinition[]): string {
  if (pool.mode === "all") return formatResourceAmounts(pool.rewards, resources, { showPlus: true }) || "0";
  if (pool.mode === "weighted_one") return `одна по весам: ${pool.options.map((option) => option.reward ? formatResourceAmounts([option.reward], resources, { showPlus: true }) : "ничего").join(", ")}`;
  return `по шансам: ${pool.options.map((option) => `${formatResourceAmounts([option.reward], resources, { showPlus: true })} (${option.chanceBps / 100}%)`).join(", ")}`;
}
