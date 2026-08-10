import { assertValidResourceAmount } from "./resources";
import type { Resource, RewardPool } from "./reward.types";

export function validateRewardPool(pool: RewardPool, resourcesById: ReadonlyMap<string, Resource>): void {
  switch (pool.mode) {
    case "all":
      pool.rewards.forEach((reward) => assertValidResourceAmount(reward, resourcesById));
      return;
    case "weighted_one":
      if (
        !pool.options.length ||
        pool.options.some((option) => !Number.isSafeInteger(option.weight) || option.weight <= 0)
      ) {
        throw new Error("Weighted reward pool options require positive integer weights");
      }
      pool.options.forEach((option) => {
        if (option.reward) assertValidResourceAmount(option.reward, resourcesById);
      });
      return;
    case "independent":
      pool.options.forEach((option) => {
        if (!Number.isInteger(option.chanceBps) || option.chanceBps < 0 || option.chanceBps > 10_000) {
          throw new Error("Independent reward pool chances must be integers from 0 to 10000");
        }
        assertValidResourceAmount(option.reward, resourcesById);
      });
  }
}
