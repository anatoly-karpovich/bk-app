import type {
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyCurrencyDefinition,
  JourneyCurrencyValue,
  JourneyMapCell,
  JourneyRules,
  JourneyRulesCell,
  JourneyRulesInput,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeCurrencyValues(values: JourneyCurrencyValue[]): JourneyCurrencyValue[] {
  return values
    .map((value) => ({
      currencyId: value.currencyId.trim(),
      value: Math.trunc(value.value),
    }))
    .filter((value) => value.currencyId);
}

function normalizeAchievementRewards(rewards: JourneyCurrencyValue[] | undefined): JourneyCurrencyValue[] {
  return normalizeCurrencyValues(Array.isArray(rewards) ? rewards : []);
}

export const DEFAULT_JOURNEY_RULES: JourneyRules = {
  initialRewards: [{ currencyId: "default", value: 15 }],
  minDice: 1,
  maxDice: 5,
  maxPrizes: [{ currencyId: "default", value: 30 }],
  mapSize: 50,
  jackpot: {
    count: 7,
    rewards: [{ currencyId: "default", value: 30 }],
  },
  cells: [
    { id: "bonus_2", kind: "bonus", rewards: [{ currencyId: "default", value: 2 }], count: 12 },
    { id: "bonus_3", kind: "bonus", rewards: [{ currencyId: "default", value: 3 }], count: 5 },
    { id: "bonus_5", kind: "bonus", rewards: [{ currencyId: "default", value: 5 }], count: 2 },
    { id: "trap_3", kind: "trap", rewards: [{ currencyId: "default", value: -3 }], count: 2 },
    { id: "trap_2", kind: "trap", rewards: [{ currencyId: "default", value: -2 }], count: 4 },
    { id: "trap_1", kind: "trap", rewards: [{ currencyId: "default", value: -1 }], count: 4 },
  ],
  achievements: {
    unlucky: { rewards: [{ currencyId: "default", value: 5 }] },
    careful: { rewards: [{ currencyId: "default", value: 5 }] },
    collector: { rewards: [{ currencyId: "default", value: 5 }] },
    lucky: { rewards: [{ currencyId: "default", value: 5 }] },
  },
};

export const MOVE_TYPES = {
  JACKPOT: "moveWithJackpot",
  EMPTY_JACKPOT: "moveWithEmptyJackpot",
  INCREASE: "moveWithIncreasingPrize",
  DECREASE: "moveWithDecreasingPrize",
  EMPTY: "moveWithoutBonus",
  FINISH: "moveToFinish",
  AT_MAX: "moveWithMaxPrize",
  TO_MAX: "moveToMaxPrize",
  TO_ZERO: "moveToZeroPrize",
  AT_ZERO: "moveWithZeroPrize",
  ACHIEVEMENT: "moveToAchievement",
} as const;

export function normalizeJourneyRules(rawRules: JourneyRulesInput = {}): JourneyRules {
  const rules = clone(DEFAULT_JOURNEY_RULES);

  return {
    ...rules,
    ...rawRules,
    initialRewards: normalizeCurrencyValues(rawRules.initialRewards ?? rules.initialRewards),
    maxPrizes:
      rawRules.maxPrizes === null ? null : normalizeCurrencyValues(rawRules.maxPrizes ?? rules.maxPrizes ?? []),
    jackpot: {
      ...rules.jackpot,
      ...(rawRules.jackpot ?? {}),
      rewards: normalizeCurrencyValues(rawRules.jackpot?.rewards ?? rules.jackpot.rewards),
    },
    achievements: {
      unlucky: {
        rewards: normalizeAchievementRewards(
          rawRules.achievements?.unlucky?.rewards ?? rules.achievements.unlucky.rewards,
        ),
      },
      careful: {
        rewards: normalizeAchievementRewards(
          rawRules.achievements?.careful?.rewards ?? rules.achievements.careful.rewards,
        ),
      },
      collector: {
        rewards: normalizeAchievementRewards(
          rawRules.achievements?.collector?.rewards ?? rules.achievements.collector.rewards,
        ),
      },
      lucky: {
        rewards: normalizeAchievementRewards(rawRules.achievements?.lucky?.rewards ?? rules.achievements.lucky.rewards),
      },
    },
    cells:
      Array.isArray(rawRules.cells) && rawRules.cells.length
        ? rawRules.cells.map((cell) => ({
            id: cell.id,
            kind: cell.kind,
            count: cell.count,
            rewards: normalizeCurrencyValues(cell.rewards),
          }))
        : rules.cells,
  };
}

export function getJourneyConfig(
  rules: JourneyRules = DEFAULT_JOURNEY_RULES,
  currencies: JourneyCurrencyDefinition[] = [{ id: "default", label: "фишек" }],
): JourneyConfig {
  const normalizedRules = normalizeJourneyRules(rules);

  return {
    mapSize: normalizedRules.mapSize,
    finishPosition: normalizedRules.mapSize + 1,
    initialRewards: normalizedRules.initialRewards,
    minDice: normalizedRules.minDice,
    maxDice: normalizedRules.maxDice,
    maxPrizes: normalizedRules.maxPrizes,
    jackpotRewards: normalizedRules.jackpot.rewards,
    currencies: clone(currencies),
  };
}

export function getJourneyBonusCells(
  rules: JourneyRules = DEFAULT_JOURNEY_RULES,
): Array<{ cell: JourneyMapCell; amount: number }> {
  const normalizedRules = normalizeJourneyRules(rules);

  return [
    {
      cell: {
        id: "jackpot",
        kind: "bonus",
        rewards: normalizedRules.jackpot.rewards,
        isJackpot: true,
        winner: null,
      },
      amount: normalizedRules.jackpot.count,
    },
    ...normalizedRules.cells.map((cell) => ({
      cell: {
        id: cell.id,
        kind: cell.kind,
        rewards: cell.rewards,
      },
      amount: cell.count,
    })),
  ];
}

export function getJourneyAchievements(rules: JourneyRules = DEFAULT_JOURNEY_RULES): JourneyAchievementsMap {
  const normalizedRules = normalizeJourneyRules(rules);

  return {
    JACKPOT: {
      name: "Jackpot",
      title: "Сокровище",
      rewards: normalizedRules.jackpot.rewards,
    },
    UNLUCKY: {
      name: "Unlucky",
      title: "Невезучий",
      rewards: normalizedRules.achievements.unlucky.rewards,
      description: "Попадание на 3 клетки с ловушками подряд",
    },
    CAREFUL: {
      name: "Careful",
      title: "Осторожный",
      rewards: normalizedRules.achievements.careful.rewards,
      description: "Попадание на 4 пустые клетки подряд",
    },
    COLLECTOR: {
      name: "Collector",
      title: "Коллекционер",
      rewards: normalizedRules.achievements.collector.rewards,
      description: "Попадание на все виды ловушек и бонусных клеток, кроме сокровища",
    },
    LUCKY: {
      name: "Lucky",
      title: "Счастливчик",
      rewards: normalizedRules.achievements.lucky.rewards,
      description: "Попадание на 5 клеток с наградой подряд, без учёта сокровища",
    },
  };
}

export function getCollectibleJourneyCells(rules: JourneyRules = DEFAULT_JOURNEY_RULES): JourneyRulesCell[] {
  const normalizedRules = normalizeJourneyRules(rules);
  return normalizedRules.cells.map((cell) => clone(cell));
}

const normalizedDefaultRules = normalizeJourneyRules(DEFAULT_JOURNEY_RULES);

export const JOURNEY_CONFIG = getJourneyConfig(normalizedDefaultRules);
export const JOURNEY_BONUS_CELLS = getJourneyBonusCells(normalizedDefaultRules);
export const JOURNEY_ACHIEVEMENTS = getJourneyAchievements(normalizedDefaultRules);
export const JOURNEY_COLLECTIBLE_CELLS = getCollectibleJourneyCells(normalizedDefaultRules);
