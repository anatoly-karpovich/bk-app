const battleshipConfig = {
  boardSize: 6,
  ships: [
    { size: 3, amount: 1 },
    { size: 2, amount: 2 },
    { size: 1, amount: 4 },
  ],
  maxShots: 20,
  prizes: {
    shoot: 5,
    destroyBonus: {
      3: 15,
      2: 5,
      1: 5,
    },
  },
};
