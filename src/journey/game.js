class Game {
  static moveIndex = 0;
  static logger;
  #started;

  constructor() {
    this.#started = false;
    Game.logger = new Logger();
  }

  #createPlayers(players) {
    this.players = players.map((nickName) => new Player(nickName));
  }

  startGame(players = [], map) {
    if (!players.length) {
      throw new Error("No players");
    }
    this.#createPlayers(players);
    this.#started = true;
    Game.moveIndex = 0;
    this.map = new GameMap(map);
    this.MoveController = new MovesController(this.map);
    Game.logger.startGame(players, this.map.getMap());
  }

  getGameLog() {
    const gameLog = journeyService.getGame();
    return gameLog;
  }

  restoreGame() {
    const gameLog = this.getGameLog();
    this.map = new GameMap(gameLog.map);
    this.MoveController = new MovesController(this.map);

    Game.moveIndex = Object.keys(gameLog.moves).length;
    const lastMove = gameLog.moves[Object.keys(gameLog.moves).at(-1)];
    if (!lastMove) {
      this.players = this.#createPlayers(gameLog.players);
    } else {
      const playersFromStorage = Object.values(lastMove).map((m) => m.player);
      this.players = playersFromStorage.map((player) => new Player(player.nickname, player));
    }
    Game.logger.restoreGameComments();
    this.#started = true;

    return gameLog;
  }

  makeMoves(moves) {
    if (!this.#started) return;

    if (this.isGameOver()) {
      return;
    }
    Game.moveIndex += 1;
    this.MoveController.makeMoves(moves, Game.moveIndex);
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
    if (!this.#started) return;

    return this.players.every((p) => p.getCurrentPosition() === configuration.finishPosition);
  }

  getGameResults() {
    if (!this.#started) return;

    if (!this.isGameOver()) {
      return;
    }
    let gameResults = this.players.reduce((res, p) => {
      res[p.nickname] = p.getFullPrize();
      return res;
    }, {});
    let result =
      "\n" +
      this.players
        .sort((a, b) => b.getFullPrize() - a.getFullPrize())
        .map((p) => `Игрок ${p.nickname} получает ${p.getFullPrize()} ${configuration.currency}`)
        .join("\n");
    result += "\n" + "\n" + `Всего приняло участия: ${this.players.length} игроков`;
    result += "\n" + `Всего игроки вынесли: ${this.getFullPrize()} ${configuration.currency}`;
    return result + "\n" + "\n====================================================\n" + "\n" + generateReceiptsReport(calculateReceipts(gameResults));
  }

  getFinishedPlayers() {
    if (!this.#started) return;

    return this.players.filter((p) => p.getCurrentPosition() === configuration.finishPosition);
  }

  getFullPrize() {
    return this.players.reduce((a, b) => a + b.getCurrentPrize(), 0);
  }

  removePlayer(nickname) {
    if (!this.#started) return;

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
