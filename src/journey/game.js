class Game {
  static jackpot = { isObtained: false, winner: null };
  static moveIndex = 0;

  constructor(players = []) {
    this.moveIndex = 0;
    if (!players.length) throw new Error("No players");
    this.players = players.map((nickName) => new Player(nickName));
    Game.jackpot.isObtained = false;
    this.map = new GameMap();
    this.MoveController = new MoveController(this.map);
  }

  makeMoves(moves) {
    if (this.isGameOver()) {
      return;
    }
    Game.moveIndex += 1;
    moves.forEach((move) => this.MoveController.makeMove(move.player, move.dice));
  }

  // simulateGame() {
  //   logger.log(`Jackpot cell: ${map.getJackpotCell()}`);
  //   map.logMap();

  //   while (this.players.filter((p) => p.getCurrentPosition() < configuration.finishPosition).length) {
  //     this.makeMoves(this.generateMoves());
  //   }
  //   this.players.forEach((player) => console.log(`Prize for ${player.nickname}: ${player.getCurrentPrize()}`));
  //   if (Game.jackpot.isObtained) {
  //     logger.log(`${Game.jackpot.winner} нашел сокровище`);
  //   } else {
  //     logger.log(`Сокровище не было найдено`);
  //   }
  //   logger.log(`====== Игра Завершена ======`);
  // }

  generateMoves() {
    return this.players.map((p) => {
      return { player: p, dice: dice() };
    });
  }

  isGameOver() {
    return this.players.every((p) => p.getCurrentPosition() === configuration.finishPosition);
  }
}

function dice() {
  return generateNumberInRange(1, configuration.maxNumberOfSteps);
}

// const c = new Game(["Геральт из Ривии", "Euthonasia"]);
// c.simulateGame();
