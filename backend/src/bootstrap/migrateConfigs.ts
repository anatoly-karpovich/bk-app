import { getDefaultMongoDatabase } from "../infrastructure/mongo/defaultMongo";
import { normalizeBattleshipsRules } from "../modules/battleships/domain/config";
import { ConfigsRepository } from "../modules/configs/ConfigsRepository";
import { createDefaultConfigCurrency, normalizeConfigCurrencies } from "../modules/configs/domain/normalizeConfig";
import type { AppConfig, ConfigCurrency } from "../modules/configs/domain/types";
import { normalizeJourneyRules } from "../modules/journey/domain/config";
import { normalizeLottoRules } from "../modules/lotto/domain/config";

function resolveMigratedCurrencies(
  currencies: ConfigCurrency[] | undefined,
  legacyCurrency: string | undefined,
): ConfigCurrency[] {
  const normalizedCurrencies = normalizeConfigCurrencies(currencies ?? []);

  if (normalizedCurrencies.length) {
    return normalizedCurrencies;
  }

  return [createDefaultConfigCurrency(legacyCurrency)];
}

function hasLegacyJourneyConfigShape(journeyConfig: unknown): boolean {
  if (!journeyConfig || typeof journeyConfig !== "object") {
    return false;
  }

  const candidate = journeyConfig as {
    initialPrize?: unknown;
    maxPrize?: unknown;
    jackpot?: { prize?: unknown };
    cells?: Array<{ value?: unknown }>;
    achievements?: Record<string, { prize?: unknown }>;
  };

  return Boolean(
    "initialPrize" in candidate ||
      "maxPrize" in candidate ||
      (candidate.jackpot && "prize" in candidate.jackpot) ||
      candidate.cells?.some((cell) => cell && "value" in cell) ||
      Object.values(candidate.achievements ?? {}).some((achievement) => achievement && "prize" in achievement),
  );
}

function hasLegacyBattleshipsConfigShape(battleshipsConfig: unknown): boolean {
  if (!battleshipsConfig || typeof battleshipsConfig !== "object") {
    return false;
  }

  const candidate = battleshipsConfig as {
    boards?: Record<string, { currency?: unknown; prizes?: { shoot?: unknown; destroyBonus?: Record<string, unknown> } }>;
  };

  return Object.values(candidate.boards ?? {}).some((board) => {
    if (!board || typeof board !== "object") {
      return false;
    }

    const destroyBonusValues = Object.values(board.prizes?.destroyBonus ?? {});
    return (
      typeof board.currency === "string" ||
      typeof board.prizes?.shoot === "number" ||
      destroyBonusValues.some((value) => typeof value === "number")
    );
  });
}

function hasLegacyLottoConfigShape(lottoConfig: unknown): boolean {
  if (!lottoConfig || typeof lottoConfig !== "object") {
    return false;
  }

  const candidate = lottoConfig as {
    firstPlacePrize?: unknown;
    secondPlacePrize?: unknown;
    otherActivePlayersPrize?: unknown;
  };

  return (
    typeof candidate.firstPlacePrize === "number" ||
    typeof candidate.secondPlacePrize === "number" ||
    typeof candidate.otherActivePlayersPrize === "number"
  );
}

function migrateJourneyConfig(journeyConfig: unknown, defaultCurrencyId: string) {
  if (hasLegacyJourneyConfigShape(journeyConfig)) {
    const legacyJourney = journeyConfig as {
      initialPrize?: number;
      minDice?: number;
      maxDice?: number;
      maxPrize?: number | null;
      mapSize?: number;
      jackpot?: { count?: number; prize?: number };
      cells?: Array<{ id: string; kind: "bonus" | "trap"; value: number; count: number }>;
      achievements?: {
        unlucky?: { prize?: number };
        careful?: { prize?: number };
        collector?: { prize?: number };
        lucky?: { prize?: number };
      };
    };

    return normalizeJourneyRules({
      initialRewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.initialPrize ?? 15) }],
      minDice: legacyJourney.minDice,
      maxDice: legacyJourney.maxDice,
      maxPrizes:
        legacyJourney.maxPrize === null
          ? null
          : [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.maxPrize ?? 30) }],
      mapSize: legacyJourney.mapSize,
      jackpot: {
        count: legacyJourney.jackpot?.count,
        rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.jackpot?.prize ?? 30) }],
      },
      cells: (legacyJourney.cells ?? []).map((cell) => ({
        id: cell.id,
        kind: cell.kind,
        count: cell.count,
        rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(cell.value) }],
      })),
      achievements: {
        unlucky: {
          rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.achievements?.unlucky?.prize ?? 5) }],
        },
        careful: {
          rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.achievements?.careful?.prize ?? 5) }],
        },
        collector: {
          rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.achievements?.collector?.prize ?? 5) }],
        },
        lucky: {
          rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyJourney.achievements?.lucky?.prize ?? 5) }],
        },
      },
    });
  }

  return normalizeJourneyRules(journeyConfig ?? {});
}

function migrateBattleshipsConfig(battleshipsConfig: unknown, defaultCurrencyId: string) {
  if (hasLegacyBattleshipsConfigShape(battleshipsConfig)) {
    const legacyBattleships = battleshipsConfig as {
      selectedBoardSize?: number;
      boards?: Record<
        string,
        {
          boardSize?: number;
          ships?: Array<{ size: number; amount: number }>;
          maxShots?: number;
          prizes?: {
            shoot?: number | Array<{ currencyId: string; value: number }>;
            destroyBonus?: Record<string, number | Array<{ currencyId: string; value: number }>>;
          };
        }
      >;
    };

    return normalizeBattleshipsRules({
      selectedBoardSize: legacyBattleships.selectedBoardSize,
      boards: Object.fromEntries(
        Object.entries(legacyBattleships.boards ?? {}).map(([boardKey, board]) => [
          boardKey,
          {
            boardSize: board.boardSize,
            ships: board.ships,
            maxShots: board.maxShots,
            prizes: {
              shoot: Array.isArray(board.prizes?.shoot)
                ? board.prizes?.shoot
                : [{ currencyId: defaultCurrencyId, value: Number(board.prizes?.shoot ?? 0) }],
              destroyBonus: Object.fromEntries(
                Object.entries(board.prizes?.destroyBonus ?? {}).map(([size, reward]) => [
                  size,
                  Array.isArray(reward) ? reward : [{ currencyId: defaultCurrencyId, value: Number(reward ?? 0) }],
                ]),
              ),
            },
          },
        ]),
      ),
    });
  }

  return normalizeBattleshipsRules(battleshipsConfig ?? {});
}

function migrateLottoConfig(lottoConfig: unknown, defaultCurrencyId: string) {
  if (hasLegacyLottoConfigShape(lottoConfig)) {
    const legacyLotto = lottoConfig as {
      min?: number;
      max?: number;
      cardNumbersAmount?: number;
      firstPlacePrize?: number | Array<{ currencyId: string; value: number }>;
      secondPlacePrize?: number | Array<{ currencyId: string; value: number }>;
      otherActivePlayersPrize?: number | Array<{ currencyId: string; value: number }>;
      rewardDistributionMode?: "full_per_winner" | "split_pool";
    };

    const toRewards = (reward: number | Array<{ currencyId: string; value: number }> | undefined) =>
      Array.isArray(reward) ? reward : [{ currencyId: defaultCurrencyId, value: Math.trunc(reward ?? 0) }];

    return normalizeLottoRules({
      min: legacyLotto.min,
      max: legacyLotto.max,
      cardNumbersAmount: legacyLotto.cardNumbersAmount,
      firstPlacePrize: toRewards(legacyLotto.firstPlacePrize),
      secondPlacePrize: toRewards(legacyLotto.secondPlacePrize),
      otherActivePlayersPrize: toRewards(legacyLotto.otherActivePlayersPrize),
      rewardDistributionMode: legacyLotto.rewardDistributionMode,
    });
  }

  return normalizeLottoRules(lottoConfig ?? {});
}

function migrateConfigDocument(document: Awaited<ReturnType<ConfigsRepository["findAll"]>>[number]): AppConfig {
  const fallbackTimestamp = document._id.getTimestamp().toISOString();
  const createdAt = document.createdAt?.trim() || fallbackTimestamp;
  const updatedAt = document.updatedAt?.trim() || createdAt;
  const legacyDocument = document as typeof document & {
    currency?: string;
    currencies?: ConfigCurrency[];
  };
  const currencies = resolveMigratedCurrencies(legacyDocument.currencies, legacyDocument.currency);
  const defaultCurrencyId = currencies[0]?.id ?? "default";
  const games = document.games;

  if (!games) {
    throw new Error(`Config "${document._id.toHexString()}" is missing games payload`);
  }

  return {
    name: document.name?.trim() || "",
    description: document.description?.trim() || "",
    currencies,
    games: {
      journey: migrateJourneyConfig(games.journey, defaultCurrencyId),
      battleships: migrateBattleshipsConfig(games.battleships, defaultCurrencyId),
      lotto: migrateLottoConfig(games.lotto, defaultCurrencyId),
    },
    createdAt,
    updatedAt,
  };
}

function configNeedsMigration(document: Awaited<ReturnType<ConfigsRepository["findAll"]>>[number]): boolean {
  return (
    !Array.isArray(document.currencies) ||
    !document.currencies.length ||
    hasLegacyJourneyConfigShape(document.games?.journey) ||
    hasLegacyBattleshipsConfigShape(document.games?.battleships) ||
    hasLegacyLottoConfigShape(document.games?.lotto)
  );
}

export async function migrateConfigs(): Promise<void> {
  const configsRepository = new ConfigsRepository(getDefaultMongoDatabase());
  const configs = await configsRepository.findAll();
  const configsToMigrate = configs.filter(configNeedsMigration);

  if (!configsToMigrate.length) {
    return;
  }

  for (const config of configsToMigrate) {
    const migratedConfig = migrateConfigDocument(config);
    await configsRepository.update(config._id.toHexString(), migratedConfig);
  }

  console.log(`Migrated ${configsToMigrate.length} config(s) to currencies[] and multi-currency game rewards`);
}
