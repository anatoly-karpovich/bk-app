import type { BattleshipsBoardRules, BattleshipsRules } from "../../battleships/domain/types";
import type { JourneyRules } from "../../journey/domain/types";
import type { LottoRules } from "../../lotto/domain/types";

export interface AppGamesConfig {
  journey: JourneyRules;
  battleships: BattleshipsRules;
  lotto: LottoRules;
}

export type JourneyConfigInput = Omit<JourneyRules, "currency">;
export type BattleshipsBoardConfigInput = Omit<BattleshipsBoardRules, "currency">;

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
  currency: string;
  games: AppGamesConfigInput;
}

export type AppConfigSeed = AppConfigMutationInput;

export interface AppConfig {
  name: string;
  description: string;
  currency: string;
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
  otherActivePlayersPrize: number;
  rewardDistributionMode: LottoRules["rewardDistributionMode"];
}

export interface AppConfigReadModel extends AppConfig {
  id: string;
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
  lottoSummary: LottoConfigSummary | null;
}
