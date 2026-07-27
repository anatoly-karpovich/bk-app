export const MAX_CHANCE_BPS = 10_000;

export interface Randomizer {
  succeeds(chanceBps: number): boolean;
  pickWeightedIndex(weights: readonly number[]): number;
}
