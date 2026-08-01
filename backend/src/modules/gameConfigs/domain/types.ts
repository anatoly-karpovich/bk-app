import type { BattleshipsRules } from "../../battleships/domain/types";
import type { JourneyAchievementsMap, JourneyConfig, JourneyRules } from "../../journey/domain/types";
import type { LottoRules } from "../../lotto/domain/types";
import type { CurrencySnapshot } from "../../../common/currency";

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
  rewardDistributionMode: LottoRules["rewardDistributionMode"];
}

interface BaseGameConfig<TRules, TGameType extends GameType> {
  projectId: string;
  gameType: TGameType;
  name: string;
  description: string;
  rules: TRules;
  createdAt: string;
  updatedAt: string;
}

export type JourneyGameConfig = BaseGameConfig<JourneyRules, "journey">;
export type BattleshipsGameConfig = BaseGameConfig<BattleshipsRules, "battleships">;
export type LottoGameConfig = BaseGameConfig<LottoRules, "lotto">;

export type AnyGameConfig = JourneyGameConfig | BattleshipsGameConfig | LottoGameConfig;

export interface GameConfigDocument {
  projectId: string;
  gameType: GameType;
  name: string;
  description: string;
  rules: JourneyRules | BattleshipsRules | LottoRules;
  createdAt: string;
  updatedAt: string;
}

type BaseGameConfigReadModel<TConfig extends AnyGameConfig, TSummary> = TConfig & {
  id: string;
  summary: TSummary;
};

export type JourneyGameConfigReadModel = BaseGameConfigReadModel<JourneyGameConfig, JourneyGameConfigSummary> & {
  journeyConfig: JourneyConfig;
  journeyAchievements: JourneyAchievementsMap;
};
export type BattleshipsGameConfigReadModel = BaseGameConfigReadModel<BattleshipsGameConfig, BattleshipsGameConfigSummary>;
export type LottoGameConfigReadModel = BaseGameConfigReadModel<LottoGameConfig, LottoGameConfigSummary>;

export type AnyGameConfigReadModel =
  | JourneyGameConfigReadModel
  | BattleshipsGameConfigReadModel
  | LottoGameConfigReadModel;

export interface GameConfigContext<TConfig extends AnyGameConfig = AnyGameConfig> {
  projectCurrencies: CurrencySnapshot[];
  projectResources: import("../../rewards").ResourceSnapshot[];
  config: TConfig;
}
