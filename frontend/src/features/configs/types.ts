import type { JourneyRules } from "../journey/types";

export interface AppGamesConfig {
  journey?: JourneyRules;
  battleships?: Record<string, unknown>;
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

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  games: AppGamesConfig;
  journeySummary: JourneyConfigSummary | null;
}
