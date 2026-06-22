import { getJourneyConfig } from "../journey/domain/config";
import type { AppConfig, AppConfigReadModel } from "./domain/types";

export class ConfigReadModelFactory {
  create(config: AppConfig): AppConfigReadModel {
    if (!config.games.journey) {
      return {
        ...config,
        journeySummary: null,
      };
    }

    const journeyConfig = getJourneyConfig(config.games.journey);
    const bonusKinds = config.games.journey.cells.filter((cell) => cell.kind === "bonus").length;
    const trapKinds = config.games.journey.cells.filter((cell) => cell.kind === "trap").length;

    return {
      ...config,
      journeySummary: {
        currency: journeyConfig.currency,
        mapSize: journeyConfig.mapSize,
        diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
        jackpot: `${config.games.journey.jackpot.count} x ${config.games.journey.jackpot.prize}`,
        bonusKinds,
        trapKinds,
        prizeLimit: journeyConfig.maxPrize,
      },
    };
  }
}
