import type {
  JourneyAchievementsMap,
  JourneyConfig,
  JourneyResourceDefinition,
  JourneyRules,
  RewardPool,
} from "./types";

const defaultRewardPool: RewardPool = {
  mode: "all",
  rewards: [{ resourceId: "default", amount: 15 }],
};

export const DEFAULT_JOURNEY_RULES: JourneyRules = {
  initialRewardPool: defaultRewardPool,
  minDice: 1,
  maxDice: 5,
  resourceLimits: [{ resourceId: "default", min: 0, max: 30 }],
  mapSize: 50,
  jackpot: {
    countMode: "fixed",
    count: 7,
    playersPerJackpot: 3,
    rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 30 }] },
  },
  cells: [
    { id: "bonus_2", kind: "bonus", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 2 }] }, count: 12 },
    { id: "bonus_3", kind: "bonus", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 3 }] }, count: 5 },
    { id: "bonus_5", kind: "bonus", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 5 }] }, count: 2 },
    { id: "trap_3", kind: "trap", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: -3 }] }, count: 2 },
    { id: "trap_2", kind: "trap", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: -2 }] }, count: 4 },
    { id: "trap_1", kind: "trap", rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: -1 }] }, count: 4 },
  ],
  achievements: {
    unlucky: { rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 5 }] } },
    careful: { rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 5 }] } },
    collector: { rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 5 }] } },
    lucky: { rewardPool: { mode: "all", rewards: [{ resourceId: "default", amount: 5 }] } },
  },
};

/** Builds only the display fields required before a game is created. */
export function getJourneyConfig(rules: JourneyRules, resources: JourneyResourceDefinition[]): JourneyConfig {
  return {
    mapSize: rules.mapSize,
    finishPosition: rules.mapSize + 1,
    initialRewardPool: rules.initialRewardPool,
    minDice: rules.minDice,
    maxDice: rules.maxDice,
    resourceLimits: rules.resourceLimits,
    jackpotRewardPool: rules.jackpot.rewardPool,
    resources,
  };
}

export function getJourneyAchievements(rules: JourneyRules): JourneyAchievementsMap {
  return {
    JACKPOT: { name: "Jackpot", title: "Сокровище", rewardPool: rules.jackpot.rewardPool },
    UNLUCKY: { name: "Unlucky", title: "Невезучий", rewardPool: rules.achievements.unlucky.rewardPool, description: "Попадание на 3 клетки с ловушками подряд" },
    CAREFUL: { name: "Careful", title: "Осторожный", rewardPool: rules.achievements.careful.rewardPool, description: "Попадание на 4 пустые клетки подряд" },
    COLLECTOR: { name: "Collector", title: "Коллекционер", rewardPool: rules.achievements.collector.rewardPool, description: "Попадание на все виды бонусных, ловушек и пустую клетку" },
    LUCKY: { name: "Lucky", title: "Счастливчик", rewardPool: rules.achievements.lucky.rewardPool, description: "Попадание на 5 клеток с наградой подряд, без учёта сокровища" },
  };
}
