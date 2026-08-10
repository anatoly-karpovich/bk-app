import { validateRewardPool, type Resource, type RewardPool } from "../../rewards";
import type { LottoRules, LottoRulesInput } from "./types";

const all = (...rewards: Array<{ resourceId: string; amount: number }>): RewardPool => ({ mode: "all", rewards });
const clone = <T>(value: T): T => structuredClone(value);
export const DEFAULT_LOTTO_RULES: LottoRules = {
  min: 1,
  max: 50,
  cardNumbersAmount: 10,
  firstPlacePrize: all({ resourceId: "default", amount: 10 }),
  secondPlacePrize: all({ resourceId: "default", amount: 5 }),
  otherActivePlayersPrize: all(),
  rewardDistributionMode: "full_per_winner",
};
export function normalizeLottoRules(input: LottoRulesInput = {}): LottoRules {
  const min = integer(input.min, DEFAULT_LOTTO_RULES.min);
  const max = Math.max(min, integer(input.max, DEFAULT_LOTTO_RULES.max));
  const rangeSize = max - min + 1;
  return {
    min,
    max,
    cardNumbersAmount: Math.max(
      1,
      Math.min(rangeSize, integer(input.cardNumbersAmount, DEFAULT_LOTTO_RULES.cardNumbersAmount)),
    ),
    firstPlacePrize: pool(input.firstPlacePrize, DEFAULT_LOTTO_RULES.firstPlacePrize),
    secondPlacePrize: pool(input.secondPlacePrize, DEFAULT_LOTTO_RULES.secondPlacePrize),
    otherActivePlayersPrize: pool(input.otherActivePlayersPrize, DEFAULT_LOTTO_RULES.otherActivePlayersPrize),
    rewardDistributionMode: input.rewardDistributionMode === "split_pool" ? "split_pool" : "full_per_winner",
  };
}
export function getLottoRangeLabel(rules: LottoRules): string {
  const normalized = normalizeLottoRules(rules);
  return `${normalized.min}-${normalized.max}`;
}
export function validateLottoRules(rules: LottoRules, resources: readonly Resource[]): void {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const pools = [rules.firstPlacePrize, rules.secondPlacePrize, rules.otherActivePlayersPrize];
  pools.forEach((pool) => {
    validateRewardPool(pool, resourcesById);
    const values =
      pool.mode === "all"
        ? pool.rewards
        : pool.mode === "weighted_one"
          ? pool.options.flatMap((option) => (option.reward ? [option.reward] : []))
          : pool.options.map((option) => option.reward);
    if (values.some((value) => value.amount < 0)) throw new Error("Lotto rewards must be positive");
    if (
      rules.rewardDistributionMode === "split_pool" &&
      values.some((value) => resourcesById.get(value.resourceId)?.type === "item")
    )
      throw new Error("Split Lotto reward pools cannot contain items");
  });
}
function pool(value: unknown, fallback: RewardPool): RewardPool {
  if (value && typeof value === "object" && "mode" in value) return clone(value as RewardPool);
  if (Array.isArray(value)) {
    return {
      mode: "all",
      rewards: value.flatMap((entry) => {
        const record = entry as { currencyId?: unknown; value?: unknown };
        return typeof record.currencyId === "string" && typeof record.value === "number" && record.value !== 0
          ? [{ resourceId: record.currencyId, amount: record.value }]
          : [];
      }),
    };
  }
  return clone(fallback);
}
function integer(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
}
