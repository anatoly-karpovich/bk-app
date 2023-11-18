class Logger {
  gameLog = { map: {}, moves: {} };
  gameComments = [];
  log(message) {
    console.log(message);
  }

  logMove(moveOptions) {
    if (!this.gameLog.moves[Game.moveIndex]) {
      this.gameLog.moves[Game.moveIndex] = {};
    }
    this.gameLog.moves[Game.moveIndex][moveOptions.player] = moveOptions;
    if (!this.gameComments[Game.moveIndex]) {
      this.gameComments[Game.moveIndex] = [];
      this.gameComments[Game.moveIndex].push(`Ход ${Game.moveIndex}`);
    }
    const comment = getCommentMessage(moveOptions);
    this.gameComments[Game.moveIndex].push(comment);
    // this.log(comment);
  }

  logMap(map) {
    this.gameLog.map = map;
  }

  getGameLog() {
    return this.gameLog;
  }
}
