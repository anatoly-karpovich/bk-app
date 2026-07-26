import type { BattleshipsBoardRules, BattleshipsRules } from "../../battleships/domain/types";
import type { JourneyRules } from "../../journey/domain/types";
import type { LottoRules } from "../../lotto/domain/types";

export interface ConfigCurrency {
  id: string;
  label: string;
  code?: string;
  name?: string;
  shortLabel?: string;
  valueType?: "integer" | "decimal";
  precision?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppGamesConfig {
  journey: JourneyRules;
  battleships: BattleshipsRules;
  lotto: LottoRules;
}

export type JourneyConfigInput = JourneyRules;
export type BattleshipsBoardConfigInput = BattleshipsBoardRules;

export interface BattleshipsConfigInput {
  selectedBoardSize: number;
  boards: Record<string, BattleshipsBoardConfigInput>;
}

export interface AppGamesConfigInput {
  journey: JourneyConfigInput;
  battleships: BattleshipsConfigInput;
  lotto: LottoRules;
}

export interface AppConfigMutationInput {
  name: string;
  description: string;
  currencies: ConfigCurrency[];
  games: AppGamesConfigInput;
}

export type AppConfigSeed = AppConfigMutationInput;

export interface AppConfig {
  name: string;
  description: string;
  currencies: ConfigCurrency[];
  games: AppGamesConfig;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyConfigSummary {
  currency: string;
  mapSize: number;
  diceRange: string;
  jackpot: string;
  bonusKinds: number;
  trapKinds: number;
  prizeLimit: string | null;
}

export interface BattleshipsConfigSummary {
  boardSize: number;
  maxShots: number;
  fleet: string[];
  hitPrizeLabel: string;
}

export interface LottoConfigSummary {
  range: string;
  cardNumbersAmount: number;
  firstPlacePrizeLabel: string;
  secondPlacePrizeLabel: string;
  otherActivePlayersPrizeLabel: string;
  rewardDistributionMode: LottoRules["rewardDistributionMode"];
}

export interface AppConfigReadModel extends AppConfig {
  id: string;
  currency: string;
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
  lottoSummary: LottoConfigSummary | null;
}
