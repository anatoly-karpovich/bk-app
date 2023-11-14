const jackPotPrize = 50;
const bonusesArray = [
  { cellChange: 0, prize: 5 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: 10 },
  { cellChange: 0, prize: 5 },
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
  { cellChange: 0, prize: jackPotPrize, isJackPot: true },
];
const configuration = {
  mapSize: 50,
  finishPosition: 51,
  bonusesArray: bonusesArray,
  initialCashValue: 50,
  minNumberOfSteps: 1,
  maxNumberOfSteps: 5,
};
