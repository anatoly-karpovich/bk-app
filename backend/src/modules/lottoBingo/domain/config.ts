import { validateRewardPool, type Resource, type RewardPool } from "../../rewards";
import type { LottoBingoRules, LottoBingoRulesInput } from "./types";

const emptyPool = (): RewardPool => ({ mode: "all", rewards: [] });
export const DEFAULT_LOTTO_BINGO_RULES: LottoBingoRules = {
  barrelsToDraw: 89,
  rewards: {
    round1: emptyPool(),
    round2: emptyPool(),
    round3: emptyPool(),
    completedCard: emptyPool(),
    consolation: emptyPool(),
  },
};

export function normalizeLottoBingoRules(input: LottoBingoRulesInput = {}): LottoBingoRules {
  const barrelsToDraw =
    input.barrelsToDraw === 87 || input.barrelsToDraw === 88 || input.barrelsToDraw === 89
      ? input.barrelsToDraw
      : DEFAULT_LOTTO_BINGO_RULES.barrelsToDraw;
  const rewards: Partial<LottoBingoRules["rewards"]> = input.rewards ?? {};
  return {
    barrelsToDraw,
    rewards: {
      round1: clonePool(rewards.round1),
      round2: clonePool(rewards.round2),
      round3: clonePool(rewards.round3),
      completedCard: clonePool(rewards.completedCard),
      consolation: clonePool(rewards.consolation),
    },
  };
}

export function validateLottoBingoRules(rules: LottoBingoRules, resources: readonly Resource[]): void {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  Object.values(rules.rewards).forEach((pool) => validateRewardPool(pool, resourcesById));
}

function clonePool(pool: RewardPool | undefined): RewardPool {
  return structuredClone(pool ?? emptyPool());
}
