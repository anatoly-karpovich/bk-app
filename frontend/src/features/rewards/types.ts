export interface ResourceAmount { resourceId: string; amount: number; }
export type RewardPool =
  | { mode: "all"; rewards: ResourceAmount[] }
  | { mode: "weighted_one"; options: Array<{ reward: ResourceAmount | null; weight: number }> }
  | { mode: "independent"; options: Array<{ reward: ResourceAmount; chanceBps: number }> };

export interface ResourceDefinition {
  id: string;
  type: "currency" | "item";
  label: string;
}
