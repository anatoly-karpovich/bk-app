export const JOURNEY_CONFIG = {
  mapSize: 50,
  finishPosition: 51,
  initialPrize: 15,
  minDice: 1,
  maxDice: 5,
  maxPrize: 30,
  jackpotPrize: 30,
  currency: "фишек",
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
};

export const JOURNEY_BONUS_CELLS = [
  { cell: { prize: 0, isJackpot: true, winner: null }, amount: 7 },
  { cell: { prize: 2 }, amount: 12 },
  { cell: { prize: 3 }, amount: 5 },
  { cell: { prize: 5 }, amount: 2 },
  { cell: { prize: -3 }, amount: 2 },
  { cell: { prize: -2 }, amount: 4 },
  { cell: { prize: -1 }, amount: 4 },
];

export const JOURNEY_ACHIEVEMENTS = {
  JACKPOT: {
    name: "Jackpot",
    title: "Сокровище",
    prize: JOURNEY_CONFIG.jackpotPrize,
  },
  UNLUCKY: {
    name: "Unlucky",
    title: "Невезучий",
    prize: 5,
    description: "Попадание на 3 клетки с ловушками подряд",
  },
  CAREFUL: {
    name: "Careful",
    title: "Осторожный",
    prize: 5,
    description: "Попадание на 3 пустые клетки подряд",
  },
  COLLECTOR: {
    name: "Collector",
    title: "Коллекционер",
    prize: 5,
    description: "Попадание на все виды ловушек и бонусных клеток, кроме сокровища",
  },
  LUCKY: {
    name: "Lucky",
    title: "Счастливчик",
    prize: 5,
    description: "Попадание на 5 клеток с наградой подряд, без учёта сокровища",
  },
};

export const NON_JACKPOT_PRIZES = [...new Set(JOURNEY_BONUS_CELLS.filter(({ cell }) => !cell.isJackpot).map(({ cell }) => cell.prize))];

