import { randomInt } from "node:crypto";
import { MAX_CHANCE_BPS, type Randomizer } from "../domain/randomizer";

export class CryptoRandomizer implements Randomizer {
  succeeds(chanceBps: number): boolean {
    this.assertChanceBps(chanceBps);
    return chanceBps === 0 ? false : chanceBps === MAX_CHANCE_BPS ? true : randomInt(MAX_CHANCE_BPS) < chanceBps;
  }

  pickWeightedIndex(weights: readonly number[]): number {
    if (!weights.length) throw new Error("Weighted selection requires at least one weight");
    const total = weights.reduce((sum, weight) => {
      if (!Number.isSafeInteger(weight) || weight <= 0) throw new Error("Weights must be positive safe integers");
      const next = sum + weight;
      if (!Number.isSafeInteger(next)) throw new Error("Total weight must be a safe integer");
      return next;
    }, 0);
    const roll = randomInt(total);
    let cumulative = 0;
    for (let index = 0; index < weights.length; index += 1) {
      cumulative += weights[index];
      if (roll < cumulative) return index;
    }
    throw new Error("Weighted selection failed to resolve an index");
  }

  private assertChanceBps(chanceBps: number): void {
    if (!Number.isInteger(chanceBps) || chanceBps < 0 || chanceBps > MAX_CHANCE_BPS) {
      throw new Error(`chanceBps must be an integer between 0 and ${MAX_CHANCE_BPS}`);
    }
  }
}
