import { formatCurrencyValues } from "../../common/currencyValues";
import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig, normalizeBattleshipsRules } from "../battleships/domain/config";
import { getJourneyConfig, JOURNEY_MAX_JACKPOT_COUNT, normalizeJourneyRules } from "../journey/domain/config";
import { formatJourneyCurrencyValues } from "../journey/domain/currency";
import { getLottoRangeLabel, normalizeLottoRules } from "../lotto/domain/config";
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
    const rules = normalizeJourneyRules(config.rules);
    const journeyConfig = getJourneyConfig(rules);
    const configFields = this.publicConfigFields(config);

    return {
      id: configId,
      ...configFields,
      rules,
      summary: {
        currency: "",
        mapSize: journeyConfig.mapSize,
        diceRange: `${journeyConfig.minDice}-${journeyConfig.maxDice}`,
        jackpot: `${
          rules.jackpot.countMode === "by_players"
            ? `1 на каждые ${rules.jackpot.playersPerJackpot} игроков, максимум ${JOURNEY_MAX_JACKPOT_COUNT}`
            : rules.jackpot.count
        } x ${rules.jackpot.rewardPool.mode}`,
        bonusKinds: rules.cells.filter((cell) => cell.kind === "bonus").length,
        trapKinds: rules.cells.filter((cell) => cell.kind === "trap").length,
        prizeLimit:
          journeyConfig.resourceLimits.length ? "Настроены" : null,
      },
    };
  }

  private createBattleshipsReadModel(configId: string, config: BattleshipsGameConfig, currencies: ConfigCurrency[]) {
    const rules = normalizeBattleshipsRules(config.rules);
    const boardConfig = getBattleshipsBoardConfig(rules);
    const configFields = this.publicConfigFields(config);

    return {
      id: configId,
      ...configFields,
      rules,
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
    const rules = normalizeLottoRules(config.rules);
    const configFields = this.publicConfigFields(config);

    return {
      id: configId,
      ...configFields,
      rules,
      summary: {
        range: getLottoRangeLabel(rules),
        cardNumbersAmount: rules.cardNumbersAmount,
        firstPlacePrizeLabel:
          formatCurrencyValues(rules.firstPlacePrize, currencies, {
            includeZero: false,
          }) || "0",
        secondPlacePrizeLabel:
          formatCurrencyValues(rules.secondPlacePrize, currencies, {
            includeZero: false,
          }) || "0",
        otherActivePlayersPrizeLabel:
          formatCurrencyValues(rules.otherActivePlayersPrize, currencies, {
            includeZero: false,
          }) || "0",
        rewardDistributionMode: rules.rewardDistributionMode,
      },
    };
  }

  private publicConfigFields<TConfig extends AnyGameConfig>(config: TConfig): TConfig {
    const { _id: _ignored, ...fields } = structuredClone(config) as TConfig & { _id?: unknown };
    return fields as TConfig;
  }
}
