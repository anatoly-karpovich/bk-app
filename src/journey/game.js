class Game {
  static jackpot = { isObtained: false, winner: null };
  static moveIndex = 0;
  static logger;

  constructor(players = [], gameMap = GameMap, moveController = MoveController, logger = Logger) {
    if (!players.length) {
      throw new Error("No players");
    }
    Game.logger = new logger();
    Game.moveIndex = 0;
    this.players = players.map((nickName) => new Player(nickName));
    Game.jackpot.isObtained = false;
    this.map = new gameMap();
    this.MoveController = new moveController(this.map);
  }

  makeMoves(moves) {
    if (this.isGameOver()) {
      return;
    }
    Game.moveIndex += 1;
    moves.forEach((move) => this.MoveController.makeMove(move.player, move.dice));
  }

  simulateGame() {
    // Game.logger.log(`Jackpot cell: ${this.map.getJackpotCell()}`);
    // this.map.logMap();

    while (this.players.filter((p) => p.getCurrentPosition() < configuration.finishPosition).length) {
      this.makeMoves(this.generateMoves());
    }
    // this.players.forEach((player) => console.log(`Prize for ${player.nickname}: ${player.getCurrentPrize()}`));
    // if (Game.jackpot.isObtained) {
    //   Game.logger.log(`${Game.jackpot.winner} нашел сокровище`);
    // } else {
    //   Game.logger.log(`Сокровище не было найдено`);
    // }
    // Game.logger.log(`====== Игра Завершена ======`);
  }

  simulateGameResults() {
    // while (this.players.filter((p) => p.getCurrentPosition() < configuration.finishPosition).length) {
    //   this.makeMoves(this.generateMoves());
    // }
    this.simulateGame();
    return this.players.map((p) => p.getCurrentPrize());
  }

  generateMoves() {
    return this.players.map((p) => {
      return { player: p, dice: dice() };
    });
  }

  isGameOver() {
    return this.players.every((p) => p.getCurrentPosition() === configuration.finishPosition);
  }

  getGameResults() {
    if (!this.isGameOver()) {
      return;
    }
    return this.players.map((p) => `Игрок ${p.nickname} получает ${p.getCurrentPrize()} екр`).join("\n");
  }

  getFinishedPlayers() {
    return this.players.filter((p) => p.getCurrentPosition() === configuration.finishPosition);
  }

  removePlayer(nickname) {
    alert(nickname);
    const playerIndex = this.players.findIndex((p) => p.nickname === nickname);
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
    }
  }
}

function dice() {
  return generateNumberInRange(1, configuration.maxNumberOfSteps);
}

// const prizesArr = [];
// for (let i = 0; i < 1000; i++) {
//   const c = new Game(["Mr Eko", "Спутник Рам-Мск", "Бешеный Пупок", "pupss", "Clark", "Euthonasia", "Лисичка Истеричка", "Пэрсик"]);
//   // console.log(c.simulateGameResults());
//   const results = c.simulateGameResults();
//   const averagePrize = results.reduce((a, b) => a + b) / results.length;
//   prizesArr.push(averagePrize);
// }

// console.log(prizesArr.reduce((a, b) => a + b) / prizesArr.length);
