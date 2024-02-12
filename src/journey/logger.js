class Logger {
  constructor() {
    this.journeyService = journeyService;
  }

  gameLog = { map: {}, moves: {} };
  gameComments = [];

  log(message) {
    console.log(message);
  }

  startGame(players, map) {
    this.journeyService.startGame(players, map);
  }

  logMove(moveOptions) {
    this.journeyService.saveMove(moveOptions);

    if (!this.gameComments[Game.moveIndex]) {
      this.gameComments[Game.moveIndex] = [];
      this.gameComments[Game.moveIndex].push(`${Game.moveIndex === 1 ? "" : "\n"}======================== Ход ${Game.moveIndex} ========================`);
    }
    const comment = getCommentMessage(moveOptions);
    this.gameComments[Game.moveIndex].push(comment);
    // this.log(comment);
  }

  logMoves(moves) {
    Object.keys(moves).forEach((nickname) => {
      moves[nickname].forEach((move) => {
        this.logMove(move);
      });
    });
  }

  getGameLog() {
    return this.gameLog;
  }
}
