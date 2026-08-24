import { addResourceAmounts, type ResourceAmount } from "../../rewards";
import type { AnalyticsParticipantRewards } from "./types";

/** Aggregates saved reward amounts without changing their regular/bonus category. */
export function aggregateAnalyticsParticipantRewards(
  rewards: ReadonlyArray<Readonly<AnalyticsParticipantRewards>>,
): AnalyticsParticipantRewards {
  return {
    regular: addResourceAmounts(...rewards.map((entry) => entry.regular)),
    bonus: addResourceAmounts(...rewards.map((entry) => entry.bonus)),
  };
}

export function aggregateAnalyticsResourceAmounts(
  amounts: ReadonlyArray<readonly ResourceAmount[]>,
): ResourceAmount[] {
  return addResourceAmounts(...amounts);
}
