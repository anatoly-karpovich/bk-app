import type { WithId } from "mongodb";
import { formatCurrencyValues } from "../../common/currencyValues";
import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig } from "../battleships/domain/config";
import { getJourneyConfig } from "../journey/domain/config";
import { formatJourneyCurrencyValues } from "../journey/domain/currency";
import { getLottoRangeLabel } from "../lotto/domain/config";
import { normalizeStoredAppConfig } from "./domain/normalizeConfig";
import type { AppConfigDocument } from "./ConfigsRepository";
import type { AppConfigReadModel } from "./domain/types";

export class ConfigReadModelFactory {
  create(document: WithId<AppConfigDocument>): AppConfigReadModel {
    const { _id, ...config } = document;
    const fallbackTimestamp = _id.getTimestamp().toISOString();
    const normalizedConfig = normalizeStoredAppConfig(config, fallbackTimestamp);
    const journeyConfig = getJourneyConfig(normalizedConfig.games.journey, normalizedConfig.currencies);
    const battleshipsBoardConfig = getBattleshipsBoardConfig(normalizedConfig.games.battleships);
    const primaryCurrency = normalizedConfig.currencies[0]?.label ?? "";

    return {
      id: _id.toHexString(),
      ...normalizedConfig,
      currency: primaryCurrency,
      journeySummary: {
        currency: primaryCurrency,
        mapSize: journeyConfig.mapSize,
        diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
        jackpot: `${normalizedConfig.games.journey.jackpot.count} x ${formatJourneyCurrencyValues(normalizedConfig.games.journey.jackpot.rewards, normalizedConfig.currencies, { showPlus: true, includeZero: false })}`,
        bonusKinds: normalizedConfig.games.journey.cells.filter((cell) => cell.kind === "bonus").length,
        trapKinds: normalizedConfig.games.journey.cells.filter((cell) => cell.kind === "trap").length,
        prizeLimit:
          journeyConfig.maxPrizes === null
            ? null
            : formatJourneyCurrencyValues(journeyConfig.maxPrizes, normalizedConfig.currencies, {
                includeZero: true,
              }),
      },
      battleshipsSummary: {
        boardSize: battleshipsBoardConfig.boardSize,
        maxShots: battleshipsBoardConfig.maxShots,
        fleet: buildBattleshipsFleetSummary(battleshipsBoardConfig),
        hitPrizeLabel:
          formatCurrencyValues(battleshipsBoardConfig.prizes.shoot, normalizedConfig.currencies, {
            showPlus: true,
            includeZero: false,
          }) || "0",
      },
      lottoSummary: {
        range: getLottoRangeLabel(normalizedConfig.games.lotto),
        cardNumbersAmount: normalizedConfig.games.lotto.cardNumbersAmount,
        firstPlacePrizeLabel:
          formatCurrencyValues(normalizedConfig.games.lotto.firstPlacePrize, normalizedConfig.currencies, {
            includeZero: false,
          }) || "0",
        secondPlacePrizeLabel:
          formatCurrencyValues(normalizedConfig.games.lotto.secondPlacePrize, normalizedConfig.currencies, {
            includeZero: false,
          }) || "0",
        otherActivePlayersPrizeLabel:
          formatCurrencyValues(normalizedConfig.games.lotto.otherActivePlayersPrize, normalizedConfig.currencies, {
            includeZero: false,
          }) || "0",
        rewardDistributionMode: normalizedConfig.games.lotto.rewardDistributionMode,
      },
    };
  }
}
