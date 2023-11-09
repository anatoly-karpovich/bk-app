class Logger {
  gameLog = { map: {}, moves: {} };
  static gameComments = [];
  log(message) {
    console.log(message);
  }

  logMove(moveOptions) {
    if (!this.gameLog.moves[Game.moveIndex]) {
      this.gameLog.moves[Game.moveIndex] = {};
    }
    this.gameLog.moves[Game.moveIndex][moveOptions.player] = moveOptions;
    if (!Logger.gameComments[Game.moveIndex]) {
      Logger.gameComments[Game.moveIndex] = [];
      Logger.gameComments[Game.moveIndex].push(`Ход ${Game.moveIndex}`);
    }
    const comment = getCommentMessage(moveOptions);
    Logger.gameComments[Game.moveIndex].push(comment);
    this.log(comment);
  }

  logMap(map) {
    this.gameLog.map = map;
  }

  getGameLog() {
    return this.gameLog;
  }
}
