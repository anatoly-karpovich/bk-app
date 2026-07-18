import type { BattleshipsBoardRules, BattleshipsRules, BattleshipsShipConfig } from "../battleships/types";
import type { JourneyRules } from "../journey/types";
import type { CurrencyValue } from "../../lib/currencyValues";
import type { LottoRewardDistributionMode, LottoRules } from "../lotto/types";

export interface ConfigCurrency {
  id: string;
  label: string;
}

export interface AppGamesConfig {
  journey: JourneyRules;
  battleships: BattleshipsRules;
  lotto: LottoRules;
}

export type JourneyConfigEditorState = JourneyRules;

export interface BattleshipsDestroyBonusEditorItem {
  size: number;
  rewards: CurrencyValue[];
}

export interface BattleshipsBoardEditorState {
  boardSize: number;
  ships: BattleshipsShipConfig[];
  maxShots: number;
  prizes: {
    shoot: CurrencyValue[];
    destroyBonus: BattleshipsDestroyBonusEditorItem[];
  };
}

export interface BattleshipsConfigEditorState {
  selectedBoardSize: number;
  boards: BattleshipsBoardEditorState[];
}

export interface AppConfigEditorState {
  name: string;
  description: string;
  currencies: ConfigCurrency[];
  games: {
    journey: JourneyConfigEditorState;
    battleships: BattleshipsConfigEditorState;
    lotto: LottoRules;
  };
}

export interface AppConfigMutationPayload {
  name: string;
  description: string;
  currencies: ConfigCurrency[];
  games: {
    journey: JourneyConfigEditorState;
    battleships: {
      selectedBoardSize: number;
      boards: Record<string, BattleshipsBoardRules>;
    };
    lotto: LottoRules;
  };
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
  rewardDistributionMode: LottoRewardDistributionMode;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  currencies: ConfigCurrency[];
  currency: string;
  createdAt: string;
  updatedAt: string;
  games: AppGamesConfig;
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
  lottoSummary: LottoConfigSummary | null;
}
