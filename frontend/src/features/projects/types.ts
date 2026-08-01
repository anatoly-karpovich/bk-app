import type { BattleshipsRules } from "../battleships/types";
import type { JourneyAchievementsMap, JourneyConfig, JourneyRules } from "../journey/types";
import type { LottoRewardDistributionMode, LottoRules } from "../lotto/types";

export interface ProjectCurrency {
  type: "currency";
  id: string;
  code: string;
  name: string;
  label: string;
  valueType: "integer" | "decimal";
  precision: number;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
}
export interface ProjectItem {
  type: "item";
  id: string;
  code: string;
  name: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
}
export type ProjectResource = ProjectCurrency | ProjectItem;

export interface ProjectMutationInput {
  code: string;
  name: string;
  description: string;
  resources: Array<Omit<ProjectResource, "createdAt" | "updatedAt" | "canDelete">>;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  resources: ProjectResource[];
  /** Compatibility projection for currency-only games. */
  currencies: ProjectCurrency[];
  createdAt: string;
  updatedAt: string;
}

export type GameType = "journey" | "battleships" | "lotto";

export interface JourneyGameConfigSummary {
  currency: string;
  mapSize: number;
  diceRange: string;
  jackpot: string;
  bonusKinds: number;
  trapKinds: number;
  prizeLimit: string | null;
}

export interface BattleshipsGameConfigSummary {
  boardSize: number;
  maxShots: number;
  fleet: string[];
  hitPrizeLabel: string;
}

export interface LottoGameConfigSummary {
  range: string;
  cardNumbersAmount: number;
  firstPlacePrizeLabel: string;
  secondPlacePrizeLabel: string;
  otherActivePlayersPrizeLabel: string;
  rewardDistributionMode: LottoRewardDistributionMode;
}

interface BaseGameConfig<TGameType extends GameType, TRules, TSummary> {
  id: string;
  projectId: string;
  gameType: TGameType;
  name: string;
  description: string;
  rules: TRules;
  summary: TSummary;
  createdAt: string;
  updatedAt: string;
}

export type JourneyGameConfig = BaseGameConfig<"journey", JourneyRules, JourneyGameConfigSummary> & {
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
};
export type BattleshipsGameConfig = BaseGameConfig<"battleships", BattleshipsRules, BattleshipsGameConfigSummary>;
export type LottoGameConfig = BaseGameConfig<"lotto", LottoRules, LottoGameConfigSummary>;

export type AnyGameConfig = JourneyGameConfig | BattleshipsGameConfig | LottoGameConfig;

export interface CreateGameConfigInput {
  gameType: GameType;
  name: string;
  description: string;
  rules: JourneyRules | BattleshipsRules | LottoRules;
}

export interface UpdateGameConfigInput {
  name: string;
  description: string;
  rules: JourneyRules | BattleshipsRules | LottoRules;
}
