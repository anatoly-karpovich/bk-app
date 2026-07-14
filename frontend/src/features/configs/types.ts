import type { BattleshipsBoardRules, BattleshipsRules, BattleshipsShipConfig } from "../battleships/types";
import type { JourneyRules } from "../journey/types";
import type { LottoRewardDistributionMode, LottoRules } from "../lotto/types";

export interface AppGamesConfig {
  journey: JourneyRules;
  battleships: BattleshipsRules;
  lotto: LottoRules;
}

export type JourneyConfigEditorState = Omit<JourneyRules, "currency">;

export interface BattleshipsDestroyBonusEditorItem {
  size: number;
  bonus: number;
}

export interface BattleshipsBoardEditorState {
  boardSize: number;
  ships: BattleshipsShipConfig[];
  maxShots: number;
  prizes: {
    shoot: number;
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
  currency: string;
  games: {
    journey: JourneyConfigEditorState;
    battleships: BattleshipsConfigEditorState;
    lotto: LottoRules;
  };
}

export interface AppConfigMutationPayload {
  name: string;
  description: string;
  currency: string;
  games: {
    journey: JourneyConfigEditorState;
    battleships: {
      selectedBoardSize: number;
      boards: Record<string, Omit<BattleshipsBoardRules, "currency">>;
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
  rewardDistributionMode: LottoRewardDistributionMode;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  games: AppGamesConfig;
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
  lottoSummary: LottoConfigSummary | null;
}
