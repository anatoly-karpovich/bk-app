import type { ResourceAmount, ResourceSnapshot } from "../../rewards";
import type { LottoPayout, LottoPayoutPlace, LottoRewardDistributionMode } from "./types";

export class LottoPayoutDistributor {
  distribute(params: { playerIds: string[]; place: LottoPayoutPlace; resolvedRewards: ResourceAmount[]; mode: LottoRewardDistributionMode; resources: ResourceSnapshot[] }): LottoPayout[] {
    const { playerIds, place, resolvedRewards, mode, resources } = params;
    if (mode === "full_per_winner") return playerIds.map((playerId) => ({ playerId, place, resolvedRewards: structuredClone(resolvedRewards), awardedRewards: structuredClone(resolvedRewards), payoutStatus: mode }));
    const amountsByPlayerId = new Map(playerIds.map((playerId) => [playerId, [] as ResourceAmount[]]));
    resolvedRewards.forEach((reward) => {
      const resource = resources.find((candidate) => candidate.id === reward.resourceId);
      if (resource?.type === "item") throw new Error("Split Lotto reward pools cannot contain items");
      const scale = 10 ** (resource?.precision ?? 0); const units = Math.round(reward.amount * scale); const base = Math.trunc(units / playerIds.length); let remainder = units % playerIds.length;
      playerIds.forEach((playerId) => { const unitsForPlayer = base + (remainder > 0 ? 1 : 0); remainder -= 1; if (unitsForPlayer) amountsByPlayerId.get(playerId)!.push({ resourceId: reward.resourceId, amount: unitsForPlayer / scale }); });
    });
    return playerIds.map((playerId) => ({ playerId, place, resolvedRewards: structuredClone(resolvedRewards), awardedRewards: amountsByPlayerId.get(playerId)!, payoutStatus: mode }));
  }
}
