import type { WithId } from "mongodb";
import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig } from "../battleships/domain/config";
import { getJourneyConfig } from "../journey/domain/config";
import { getLottoRangeLabel } from "../lotto/domain/config";
import { normalizeStoredAppConfig } from "./domain/normalizeConfig";
import type { AppConfigDocument } from "./ConfigsRepository";
import type { AppConfigReadModel } from "./domain/types";

export class ConfigReadModelFactory {
  create(document: WithId<AppConfigDocument>): AppConfigReadModel {
    const { _id, ...config } = document;
    const fallbackTimestamp = _id.getTimestamp().toISOString();
    const normalizedConfig = normalizeStoredAppConfig(config, fallbackTimestamp);
    const journeyConfig = getJourneyConfig(normalizedConfig.games.journey);
    const battleshipsBoardConfig = getBattleshipsBoardConfig(normalizedConfig.games.battleships);

    return {
      id: _id.toHexString(),
      ...normalizedConfig,
      journeySummary: {
        currency: normalizedConfig.currency,
        mapSize: journeyConfig.mapSize,
        diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
        jackpot: `${normalizedConfig.games.journey.jackpot.count} x ${normalizedConfig.games.journey.jackpot.prize}`,
        bonusKinds: normalizedConfig.games.journey.cells.filter((cell) => cell.kind === "bonus").length,
        trapKinds: normalizedConfig.games.journey.cells.filter((cell) => cell.kind === "trap").length,
        prizeLimit: journeyConfig.maxPrize,
      },
      battleshipsSummary: {
        boardSize: battleshipsBoardConfig.boardSize,
        maxShots: battleshipsBoardConfig.maxShots,
        fleet: buildBattleshipsFleetSummary(battleshipsBoardConfig),
        hitPrize: battleshipsBoardConfig.prizes.shoot,
        currency: normalizedConfig.currency,
      },
      lottoSummary: {
        range: getLottoRangeLabel(normalizedConfig.games.lotto),
        cardNumbersAmount: normalizedConfig.games.lotto.cardNumbersAmount,
        firstPlacePrize: normalizedConfig.games.lotto.firstPlacePrize,
        secondPlacePrize: normalizedConfig.games.lotto.secondPlacePrize,
        otherActivePlayersPrize: normalizedConfig.games.lotto.otherActivePlayersPrize,
        rewardDistributionMode: normalizedConfig.games.lotto.rewardDistributionMode,
      },
    };
  }
}
