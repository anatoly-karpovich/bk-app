const jackPotPrize = 30;
const bonusesArray = [
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 2 },
  { cellChange: 0, prize: 3 },
  { cellChange: 0, prize: 3 },
  { cellChange: 0, prize: 3 },
  { cellChange: 0, prize: 3 },
  { cellChange: 0, prize: 3 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: -3 },
  { cellChange: 0, prize: -3 },
  { cellChange: 0, prize: -2 },
  { cellChange: 0, prize: -2 },
  { cellChange: 0, prize: -2 },
  { cellChange: 0, prize: -2 },
  { cellChange: 0, prize: -1 },
  { cellChange: 0, prize: -1 },
  { cellChange: 0, prize: -1 },
  { cellChange: 0, prize: -1 },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
  { cellChange: 0, prize: 0, isJackPot: true, winner: null },
];
const configuration = {
  mapSize: 50,
  finishPosition: 51,
  bonusesArray: bonusesArray,
  initialCashValue: 15,
  minNumberOfSteps: 1,
  maxNumberOfSteps: 5,
  maxPrize: 30,
  currency: "фишек",
  jackPotPrize: 30,
  achivementPrizes: {
    unlucky: 5,
    careful: 5,
    collector: 5,
  },
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
  MOVE_TO_ZERO_PRIZE: "moveToZeroPrize",
  MOVE_WITH_ZERO_PRIZE: "moveWithZeroPrize",
  MOVE_TO_ACHIVEMENT: "moveToAchievement",
};

const bonuses = {
  JACKPOT: {
    prize: jackPotPrize,
    name: "Jackpot",
  },
  UNLUCKY: {
    prize: configuration.achivementPrizes.unlucky,
    name: "Unlucky",
    description: "попадание на 3 клетки с ловушками подряд",
  },
  CAREFUL: {
    prize: configuration.achivementPrizes.careful,
    name: "Careful",
    description: "попадание на 3 пустые клетки подряд",
  },
  COLLECTOR: {
    prize: configuration.achivementPrizes.careful,
    name: "Collector",
    description: "попадание на все виды ловушек и бонусных клеток (кроме сокровища)",
  },
};

const bonusesNamesMapper = {
  [bonuses["JACKPOT"].name]: "Сокровище",
  [bonuses["UNLUCKY"].name]: "Невезучий",
  [bonuses["CAREFUL"].name]: "Осторожный",
  [bonuses["COLLECTOR"].name]: "Коллекционер",
};

function getAchivementByName(name) {
  let achivement = {};
  for (const key of Object.keys(bonuses)) {
    if (bonuses[key].name === name) {
      achivement = bonuses[key];
      break;
    }
  }
  return achivement;
}
