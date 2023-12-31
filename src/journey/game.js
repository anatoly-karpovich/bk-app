class Game {
  static jackpot = { isObtained: false, winner: null };
  static moveIndex = 0;
  static logger;

  constructor(players = [], gameMap = GameMap, moveController = MoveController, logger = Logger) {
    Game.logger = new logger();
    Game.moveIndex = 0;
    if (!players.length) throw new Error("No players");
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
    Game.logger.log(`Jackpot cell: ${this.map.getJackpotCell()}`);
    this.map.logMap();

    while (this.players.filter((p) => p.getCurrentPosition() < configuration.finishPosition).length) {
      this.makeMoves(this.generateMoves());
    }
    this.players.forEach((player) => console.log(`Prize for ${player.nickname}: ${player.getCurrentPrize()}`));
    if (Game.jackpot.isObtained) {
      Game.logger.log(`${Game.jackpot.winner} нашел сокровище`);
    } else {
      Game.logger.log(`Сокровище не было найдено`);
    }
    Game.logger.log(`====== Игра Завершена ======`);
  }

  simulateGameResults() {
    while (this.players.filter((p) => p.getCurrentPosition() < configuration.finishPosition).length) {
      this.makeMoves(this.generateMoves());
    }
    return this.players.map((p) => p.getCurrentPrize())[0];
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
}

function dice() {
  return generateNumberInRange(1, configuration.maxNumberOfSteps);
}
