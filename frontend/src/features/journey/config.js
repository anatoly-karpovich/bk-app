function clone(value) {
  return structuredClone(value);
}

export const oldbk2_rules = {
  currency: "фишек",
  initialPrize: 15,
  minDice: 1,
  maxDice: 5,
  maxPrize: 30,
  mapSize: 50,
  jackpot: {
    count: 7,
    prize: 30,
  },
  cells: [
    { id: "bonus_2", kind: "bonus", value: 2, count: 12 },
    { id: "bonus_3", kind: "bonus", value: 3, count: 5 },
    { id: "bonus_5", kind: "bonus", value: 5, count: 2 },
    { id: "trap_3", kind: "trap", value: -3, count: 2 },
    { id: "trap_2", kind: "trap", value: -2, count: 4 },
    { id: "trap_1", kind: "trap", value: -1, count: 4 },
  ],
  achievements: {
    unlucky: { prize: 5 },
    careful: { prize: 5 },
    collector: { prize: 5 },
    lucky: { prize: 5 },
  },
};

export const combats_club_rules = {
  currency: "екр",
  initialPrize: 30,
  minDice: 1,
  maxDice: 5,
  maxPrize: null,
  mapSize: 50,
  jackpot: {
    count: 7,
    prize: 30,
  },
  cells: [
    { id: "bonus_2", kind: "bonus", value: 2, count: 12 },
    { id: "bonus_3", kind: "bonus", value: 3, count: 5 },
    { id: "bonus_5", kind: "bonus", value: 5, count: 2 },
    { id: "trap_3", kind: "trap", value: -3, count: 2 },
    { id: "trap_2", kind: "trap", value: -2, count: 4 },
    { id: "trap_1", kind: "trap", value: -1, count: 4 },
  ],
  achievements: {
    unlucky: { prize: 10 },
    careful: { prize: 10 },
    collector: { prize: 12 },
    lucky: { prize: 15 },
  },
};

export const DEFAULT_JOURNEY_RULESET = {
  id: "oldbk2",
  name: "oldbk2",
  description: "Базовые правила Карты Мародёров",
  isBuiltIn: true,
  rules: oldbk2_rules,
};

export const COMBATS_CLUB_JOURNEY_RULES = {
  id: "combatsclub",
  name: "combatsclub",
  description: "Правила Карты Мародёров из Combats Club",
  isBuiltIn: true,
  rules: combats_club_rules,
};

export const BUILT_IN_JOURNEY_RULESETS = [DEFAULT_JOURNEY_RULESET, COMBATS_CLUB_JOURNEY_RULES];

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
};

export function normalizeJourneyRules(rawRules = {}) {
  const rules = clone(oldbk2_rules);

  return {
    ...rules,
    ...rawRules,
    jackpot: {
      ...rules.jackpot,
      ...(rawRules.jackpot ?? {}),
    },
    achievements: {
      unlucky: {
        ...rules.achievements.unlucky,
        ...(rawRules.achievements?.unlucky ?? {}),
      },
      careful: {
        ...rules.achievements.careful,
        ...(rawRules.achievements?.careful ?? {}),
      },
      collector: {
        ...rules.achievements.collector,
        ...(rawRules.achievements?.collector ?? {}),
      },
      lucky: {
        ...rules.achievements.lucky,
        ...(rawRules.achievements?.lucky ?? {}),
      },
    },
    cells:
      Array.isArray(rawRules.cells) && rawRules.cells.length
        ? rawRules.cells.map((cell) => ({ ...cell }))
        : rules.cells,
  };
}

export function normalizeJourneyRuleset(rawRuleset = {}) {
  return {
    id: rawRuleset.id ?? DEFAULT_JOURNEY_RULESET.id,
    name: rawRuleset.name?.trim?.() || DEFAULT_JOURNEY_RULESET.name,
    description: rawRuleset.description?.trim?.() || "",
    isBuiltIn: Boolean(rawRuleset.isBuiltIn),
    rules: normalizeJourneyRules(rawRuleset.rules ?? DEFAULT_JOURNEY_RULESET.rules),
  };
}

export function getBuiltInJourneyRulesets() {
  return BUILT_IN_JOURNEY_RULESETS.map((ruleset) => normalizeJourneyRuleset(ruleset));
}

export function getJourneyRulesetById(rulesetId, rulesets = getBuiltInJourneyRulesets()) {
  return rulesets.find((ruleset) => ruleset.id === rulesetId) ?? null;
}

export function getJourneyConfig(rules = oldbk2_rules) {
  const normalizedRules = normalizeJourneyRules(rules);

  return {
    mapSize: normalizedRules.mapSize,
    finishPosition: normalizedRules.mapSize + 1,
    initialPrize: normalizedRules.initialPrize,
    minDice: normalizedRules.minDice,
    maxDice: normalizedRules.maxDice,
    maxPrize: normalizedRules.maxPrize,
    jackpotPrize: normalizedRules.jackpot.prize,
    currency: normalizedRules.currency,
  };
}

export function getJourneyBonusCells(rules = oldbk2_rules) {
  const normalizedRules = normalizeJourneyRules(rules);

  return [
    {
      cell: { prize: 0, isJackpot: true, winner: null },
      amount: normalizedRules.jackpot.count,
    },
    ...normalizedRules.cells.map((cell) => ({
      cell: { prize: cell.value },
      amount: cell.count,
    })),
  ];
}

export function getJourneyAchievements(rules = oldbk2_rules) {
  const normalizedRules = normalizeJourneyRules(rules);
  const config = getJourneyConfig(normalizedRules);

  return {
    JACKPOT: {
      name: "Jackpot",
      title: "Сокровище",
      prize: config.jackpotPrize,
    },
    UNLUCKY: {
      name: "Unlucky",
      title: "Невезучий",
      prize: normalizedRules.achievements.unlucky.prize,
      description: "Попадание на 3 клетки с ловушками подряд",
    },
    CAREFUL: {
      name: "Careful",
      title: "Осторожный",
      prize: normalizedRules.achievements.careful.prize,
      description: "Попадание на 3 пустые клетки подряд",
    },
    COLLECTOR: {
      name: "Collector",
      title: "Коллекционер",
      prize: normalizedRules.achievements.collector.prize,
      description: "Попадание на все виды ловушек и бонусных клеток, кроме сокровища",
    },
    LUCKY: {
      name: "Lucky",
      title: "Счастливчик",
      prize: normalizedRules.achievements.lucky.prize,
      description: "Попадание на 5 клеток с наградой подряд, без учёта сокровища",
    },
  };
}

export function getNonJackpotPrizes(rules = oldbk2_rules) {
  return [
    ...new Set(
      getJourneyBonusCells(rules)
        .filter(({ cell }) => !cell.isJackpot)
        .map(({ cell }) => cell.prize),
    ),
  ];
}

const normalizedDefaultRules = normalizeJourneyRules(oldbk2_rules);

export const JOURNEY_CONFIG = getJourneyConfig(normalizedDefaultRules);
export const JOURNEY_BONUS_CELLS = getJourneyBonusCells(normalizedDefaultRules);
export const JOURNEY_ACHIEVEMENTS = getJourneyAchievements(normalizedDefaultRules);
export const NON_JACKPOT_PRIZES = getNonJackpotPrizes(normalizedDefaultRules);
