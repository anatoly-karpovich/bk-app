export type ResourceType = "currency" | "item";

export interface ResourceBase {
  id: string;
  code: string;
  name: string;
  label: string;
  shortLabel?: string;
  unitLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrencyResource extends ResourceBase {
  type: "currency";
  valueType: "integer" | "decimal";
  precision: number;
}

export interface ItemResource extends ResourceBase {
  type: "item";
}

export type Resource = CurrencyResource | ItemResource;
export type ResourceSnapshot = Resource;

export interface ResourceAmount {
  resourceId: string;
  amount: number;
}

export type ResourceHoldings = Record<string, number>;

export interface ResourceLimit {
  resourceId: string;
  min?: number;
  max?: number;
}

export interface AllRewardPool {
  mode: "all";
  rewards: ResourceAmount[];
}

export interface WeightedRewardOption {
  reward: ResourceAmount | null;
  weight: number;
}

export interface WeightedOneRewardPool {
  mode: "weighted_one";
  options: WeightedRewardOption[];
}

export interface IndependentRewardOption {
  reward: ResourceAmount;
  chanceBps: number;
}

export interface IndependentRewardPool {
  mode: "independent";
  options: IndependentRewardOption[];
}

export type RewardPool = AllRewardPool | WeightedOneRewardPool | IndependentRewardPool;

export interface AppliedResourceReward {
  requested: ResourceAmount;
  applied: ResourceAmount;
}

export interface ApplyRewardsResult {
  holdings: ResourceHoldings;
  rewards: AppliedResourceReward[];
}
