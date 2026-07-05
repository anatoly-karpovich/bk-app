import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig } from "../battleships/domain/config";
import { getJourneyConfig } from "../journey/domain/config";
import { getLottoRangeLabel } from "../lotto/domain/config";
import type { AppConfig, AppConfigReadModel } from "./domain/types";

export class ConfigReadModelFactory {
  create(config: AppConfig): AppConfigReadModel {
    const journeySummary = config.games.journey
      ? (() => {
          const journeyConfig = getJourneyConfig(config.games.journey);
          const bonusKinds = config.games.journey.cells.filter((cell) => cell.kind === "bonus").length;
          const trapKinds = config.games.journey.cells.filter((cell) => cell.kind === "trap").length;

          return {
            currency: journeyConfig.currency,
            mapSize: journeyConfig.mapSize,
            diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
            jackpot: `${config.games.journey.jackpot.count} x ${config.games.journey.jackpot.prize}`,
            bonusKinds,
            trapKinds,
            prizeLimit: journeyConfig.maxPrize,
          };
        })()
      : null;

    const battleshipsSummary = config.games.battleships
      ? (() => {
          const boardConfig = getBattleshipsBoardConfig(config.games.battleships);

          return {
            boardSize: boardConfig.boardSize,
            maxShots: boardConfig.maxShots,
            fleet: buildBattleshipsFleetSummary(boardConfig),
            hitPrize: boardConfig.prizes.shoot,
            currency: boardConfig.currency,
          };
        })()
      : null;

    const lottoSummary = config.games.lotto
      ? {
          range: getLottoRangeLabel(config.games.lotto),
          cardNumbersAmount: config.games.lotto.cardNumbersAmount,
          firstPlacePrize: config.games.lotto.firstPlacePrize,
          secondPlacePrize: config.games.lotto.secondPlacePrize,
          rewardDistributionMode: config.games.lotto.rewardDistributionMode,
        }
      : null;

    return {
      ...config,
      journeySummary,
      battleshipsSummary,
      lottoSummary,
    };
  }
}
