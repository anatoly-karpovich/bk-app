import type { BattleshipsRules } from "../../battleships/domain/types";
import type { JourneyRules } from "../../journey/domain/types";

export interface AppGamesConfig {
  journey?: JourneyRules;
  battleships?: BattleshipsRules;
  loto?: Record<string, unknown>;
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

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  games: AppGamesConfig;
}

export interface AppConfigReadModel extends AppConfig {
  journeySummary: JourneyConfigSummary | null;
  battleshipsSummary: BattleshipsConfigSummary | null;
}
