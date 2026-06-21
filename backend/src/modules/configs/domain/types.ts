import type { JourneyRules } from "../../journey/domain/types";

export interface AppGamesConfig {
  journey?: JourneyRules;
  battleships?: Record<string, unknown>;
  loto?: Record<string, unknown>;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  games: AppGamesConfig;
}
