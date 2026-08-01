import type { Randomizer } from "../domain/randomizer";

/** Development-only observer. It intentionally never logs the raw crypto roll. */
export class LoggingRandomizer implements Randomizer {
  constructor(private readonly delegate: Randomizer) {}

  succeeds(chanceBps: number): boolean {
    const success = this.delegate.succeeds(chanceBps);
    console.debug(JSON.stringify({ event: "reward_independent_roll", chanceBps, success }));
    return success;
  }

  pickWeightedIndex(weights: readonly number[]): number {
    const index = this.delegate.pickWeightedIndex(weights);
    console.debug(JSON.stringify({ event: "reward_weighted_pick", weights, index }));
    return index;
  }
}
