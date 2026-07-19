import { formatCurrencyValues } from "../../common/currencyValues";
import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig } from "../battleships/domain/config";
import { getJourneyConfig } from "../journey/domain/config";
import { formatJourneyCurrencyValues } from "../journey/domain/currency";
import { getLottoRangeLabel } from "../lotto/domain/config";
import type { CurrencySnapshot as ConfigCurrency } from "../../common/currency";
import type {
  AnyGameConfig,
  AnyGameConfigReadModel,
  BattleshipsGameConfig,
  JourneyGameConfig,
  LottoGameConfig,
} from "./domain/types";

export class GameConfigReadModelFactory {
  create(configId: string, config: AnyGameConfig, currencies: ConfigCurrency[]): AnyGameConfigReadModel {
    switch (config.gameType) {
      case "journey":
        return this.createJourneyReadModel(configId, config, currencies);
      case "battleships":
        return this.createBattleshipsReadModel(configId, config, currencies);
      case "lotto":
        return this.createLottoReadModel(configId, config, currencies);
    }
  }

  private createJourneyReadModel(configId: string, config: JourneyGameConfig, currencies: ConfigCurrency[]) {
    const primaryCurrency = currencies[0]?.label ?? "";
    const journeyConfig = getJourneyConfig(config.rules, currencies);

    return {
      id: configId,
      ...structuredClone(config),
      summary: {
        currency: primaryCurrency,
        mapSize: journeyConfig.mapSize,
        diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
        jackpot: `${config.rules.jackpot.count} x ${formatJourneyCurrencyValues(config.rules.jackpot.rewards, currencies, {
          showPlus: true,
          includeZero: false,
        })}`,
        bonusKinds: config.rules.cells.filter((cell) => cell.kind === "bonus").length,
        trapKinds: config.rules.cells.filter((cell) => cell.kind === "trap").length,
        prizeLimit:
          journeyConfig.maxPrizes === null
            ? null
            : formatJourneyCurrencyValues(journeyConfig.maxPrizes, currencies, {
                includeZero: true,
              }),
      },
    };
  }

  private createBattleshipsReadModel(configId: string, config: BattleshipsGameConfig, currencies: ConfigCurrency[]) {
    const boardConfig = getBattleshipsBoardConfig(config.rules);

    return {
      id: configId,
      ...structuredClone(config),
      summary: {
        boardSize: boardConfig.boardSize,
        maxShots: boardConfig.maxShots,
        fleet: buildBattleshipsFleetSummary(boardConfig),
        hitPrizeLabel:
          formatCurrencyValues(boardConfig.prizes.shoot, currencies, {
            showPlus: true,
            includeZero: false,
          }) || "0",
      },
    };
  }

  private createLottoReadModel(configId: string, config: LottoGameConfig, currencies: ConfigCurrency[]) {
    return {
      id: configId,
      ...structuredClone(config),
      summary: {
        range: getLottoRangeLabel(config.rules),
        cardNumbersAmount: config.rules.cardNumbersAmount,
        firstPlacePrizeLabel:
          formatCurrencyValues(config.rules.firstPlacePrize, currencies, {
            includeZero: false,
          }) || "0",
        secondPlacePrizeLabel:
          formatCurrencyValues(config.rules.secondPlacePrize, currencies, {
            includeZero: false,
          }) || "0",
        otherActivePlayersPrizeLabel:
          formatCurrencyValues(config.rules.otherActivePlayersPrize, currencies, {
            includeZero: false,
          }) || "0",
        rewardDistributionMode: config.rules.rewardDistributionMode,
      },
    };
  }
}
