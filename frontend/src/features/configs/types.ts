import type { BattleshipsRules } from "../battleships/types";
import type { JourneyRules } from "../journey/types";
import type { LottoRewardDistributionMode, LottoRules } from "../lotto/types";

export interface AppGamesConfig {
  journey?: JourneyRules;
  battleships?: BattleshipsRules;
  lotto?: LottoRules;
}

export interface JourneyConfigSummary {
  currency: string;
  mapSize: number;
  diceRange: string;
  jackpot: string;
  bonusKinds: number;
  trapKinds: number;
  prizeLimit: number | null;
}

export interface BattleshipsConfigSummary {
  boardSize: number;
  maxShots: number;
  fleet: string[];
  hitPrize: number;
  currency: string;
}

export interface LottoConfigSummary {
  range: string;
  cardNumbersAmount: number;
  firstPlacePrize: number;
  secondPlacePrize: number;
  rewardDistributionMode: LottoRewardDistributionMode;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  currency: string;
  games: AppGamesConfig;
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
  lottoSummary: LottoConfigSummary | null;
}
