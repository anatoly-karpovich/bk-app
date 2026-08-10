import { formatCurrencyValues } from "../../common/currencyValues";
import { buildBattleshipsFleetSummary, getBattleshipsBoardConfig, normalizeBattleshipsRules } from "../battleships/domain/config";
import { getJourneyAchievements, getJourneyConfig, JOURNEY_MAX_JACKPOT_COUNT, normalizeJourneyRules } from "../journey/domain/config";
import { formatJourneyCurrencyValues } from "../journey/domain/currency";
import { getLottoRangeLabel, normalizeLottoRules } from "../lotto/domain/config";
import { normalizeLottoBingoRules } from "../lottoBingo/domain/config";
import type { CurrencySnapshot as ConfigCurrency } from "../../common/currency";
import type { ResourceSnapshot } from "../rewards";
import type {
  AnyGameConfig,
  AnyGameConfigReadModel,
  BattleshipsGameConfig,
  JourneyGameConfig,
  LottoGameConfig,
  LottoBingoGameConfig,
} from "./domain/types";

export class GameConfigReadModelFactory {
  create(
    configId: string,
    config: AnyGameConfig,
    currencies: ConfigCurrency[],
    resources: ResourceSnapshot[] = [],
  ): AnyGameConfigReadModel {
    switch (config.gameType) {
      case "journey":
        return this.createJourneyReadModel(configId, config, currencies, resources);
      case "battleships":
        return this.createBattleshipsReadModel(configId, config, resources);
      case "lotto":
        return this.createLottoReadModel(configId, config, resources);
      case "lotto_bingo":
        return this.createLottoBingoReadModel(configId, config);
    }
  }

  private createJourneyReadModel(
    configId: string,
    config: JourneyGameConfig,
    currencies: ConfigCurrency[],
    resources: ResourceSnapshot[],
  ) {
    const rules = normalizeJourneyRules(config.rules);
    const journeyConfig = getJourneyConfig(rules, resources);
    const configFields = this.publicConfigFields(config);

    return {
      id: configId,
      ...configFields,
      rules,
      journeyConfig,
      journeyAchievements: getJourneyAchievements(rules),
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

  private createBattleshipsReadModel(configId: string, config: BattleshipsGameConfig, resources: ResourceSnapshot[]) {
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
        hitPrizeLabel: this.formatRewardPool(boardConfig.rewards.hit, resources),
      },
    };
  }

  private createLottoReadModel(configId: string, config: LottoGameConfig, resources: ResourceSnapshot[]) {
    const rules = normalizeLottoRules(config.rules);
    const configFields = this.publicConfigFields(config);

    return {
      id: configId,
      ...configFields,
      rules,
      summary: {
        range: getLottoRangeLabel(rules),
        cardNumbersAmount: rules.cardNumbersAmount,
        firstPlacePrizeLabel: this.formatRewardPool(rules.firstPlacePrize, resources),
        secondPlacePrizeLabel: this.formatRewardPool(rules.secondPlacePrize, resources),
        otherActivePlayersPrizeLabel: this.formatRewardPool(rules.otherActivePlayersPrize, resources),
        rewardDistributionMode: rules.rewardDistributionMode,
      },
    };
  }

  private createLottoBingoReadModel(configId: string, config: LottoBingoGameConfig) {
    const rules = normalizeLottoBingoRules(config.rules);
    return {
      id: configId,
      ...this.publicConfigFields(config),
      rules,
      summary: { barrelsToDraw: rules.barrelsToDraw },
    };
  }

  private publicConfigFields<TConfig extends AnyGameConfig>(config: TConfig): TConfig {
    const { _id: _ignored, ...fields } = structuredClone(config) as TConfig & { _id?: unknown };
    return fields as TConfig;
  }

  private formatRewardPool(pool: import("../rewards").RewardPool, resources: ResourceSnapshot[]): string {
    if (pool.mode !== "all") return pool.mode;
    const labels = pool.rewards.map((reward) => {
      const resource = resources.find((candidate) => candidate.id === reward.resourceId);
      const label = resource?.label ?? reward.resourceId;
      return resource?.type === "item" ? `${label} ×${Math.abs(reward.amount)}` : `${reward.amount > 0 ? "+" : ""}${reward.amount} ${label}`;
    });
    return labels.join(", ") || "0";
  }
}
