import type { ResourceAmount, RewardPool } from "../domain/reward.types";
import type { Randomizer } from "../domain/randomizer";

export class RewardResolver {
  constructor(private readonly randomizer: Randomizer) {}

  resolve(pool: RewardPool): ResourceAmount[] {
    switch (pool.mode) {
      case "all": return pool.rewards.map((reward) => ({ ...reward }));
      case "weighted_one": {
        const reward = pool.options[this.randomizer.pickWeightedIndex(pool.options.map((option) => option.weight))].reward;
        return reward ? [{ ...reward }] : [];
      }
      case "independent":
        return pool.options.filter((option) => this.randomizer.succeeds(option.chanceBps)).map((option) => ({ ...option.reward }));
    }
  }
}
