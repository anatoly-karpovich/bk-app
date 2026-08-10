import type { ResourceAmount, RewardPool } from "../domain/reward.types";
import type { Randomizer } from "../domain/randomizer";

/**
 * Resolves which resources a configured reward pool grants.
 *
 * This service intentionally does not know who receives a reward, how a game
 * stores balances, or whether a game caps a particular resource.
 */
export class RewardGrantService {
  constructor(private readonly randomizer: Randomizer) {}

  resolve(pool: RewardPool): ResourceAmount[] {
    switch (pool.mode) {
      case "all":
        return pool.rewards.map((reward) => ({ ...reward }));
      case "weighted_one": {
        const reward =
          pool.options[this.randomizer.pickWeightedIndex(pool.options.map((option) => option.weight))].reward;
        return reward ? [{ ...reward }] : [];
      }
      case "independent":
        return pool.options
          .filter((option) => this.randomizer.succeeds(option.chanceBps))
          .map((option) => ({ ...option.reward }));
    }
  }
}
