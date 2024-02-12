const jackPotPrize = 50;
const bonusesArray = [
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: -5 },
  { cellChange: 0, prize: 0, isJackPot: true },
];
const configuration = {
  mapSize: 50,
  finishPosition: 51,
  bonusesArray: bonusesArray,
  initialCashValue: 50,
  minNumberOfSteps: 1,
  maxNumberOfSteps: 5,
  maxPrize: 100,
  currency: "фишек",
};

const MOVE_TYPES = {
  MOVE_WITH_JACKPOT: "moveWithJackpot",
  MOVE_WITH_EMPTY_JACKPOT: "moveWithEmptyJackpot",
  MOVE_WITH_INCREASING_PRIZE: "moveWithIncreasingPrize",
  MOVE_WITH_DECREASING_PRIZE: "moveWithDecreasingPrize",
  MOVE_WITHOUT_BONUS: "moveWithoutBonus",
  MOVE_TO_FINISH: "moveToFinish",
  MOVE_WITN_MAX_PRIZE: "moveWithMaxPrize",
  MOVE_TO_MAX_PRIZE: "moveToMaxPrize",
};

const bonuses = {
  JACKPOT: {
    prize: jackPotPrize,
    name: "Jackpot",
  },
};
