class MoveController {
  constructor(map) {
    this.map = map;
  }
  moveLog = {};

  makeMove(player, dice) {
    this.moveLog.player = player.nickname;
    this.moveLog.dice = dice;
    this.moveLog.previousPosition = player.getCurrentPosition();
    this.moveLog.previousPrize = player.getCurrentPrize();
    if (player.getCurrentPosition() === configuration.finishPosition) {
      return;
    }
    const cell = this.handleNewCell(player, dice);
    const prize = this.handleNewPrize(player, cell);
    if (cell > configuration.mapSize) {
      this.moveLog.type = "moveToFinish";
    }
    player.move({ cell, prize });
    logger.logMove(this.moveLog);
    this.moveLog = {};
  }

  handleNewCell(player, dice) {
    const currentPosition = player.getCurrentPosition();
    let nextPosition = currentPosition + dice >= configuration.finishPosition ? configuration.finishPosition : currentPosition + dice;
    const cell = this.map.getMap()[nextPosition];

    if (cell) {
      nextPosition = nextPosition + this.map.getMap()[nextPosition]?.cellChange;
    }
    this.moveLog.currentPosition = nextPosition;
    return nextPosition;
  }

  handleNewPrize(player, newCell) {
    const cell = this.map.getMap()[newCell];
    let newPrize = player.getCurrentPrize();
    this.moveLog.cell = cell ?? null;
    if (cell) {
      if (cell.isJackPot && !Game.jackpot.isObtained) {
        Game.jackpot.isObtained = true;
        Game.jackpot.winner = player.nickname;
        newPrize += cell.prize;
        this.moveLog.jackpotWinner = true;
        this.moveLog.type = "moveWithJackpot";
      } else if (cell.isJackPot && Game.jackpot.isObtained) {
        newPrize += 0;
        this.moveLog.jackpotWinner = false;
        this.moveLog.type = "moveWithEmptyJackpot";
      } else {
        newPrize += cell.prize;
        this.moveLog.jackpotWinner = false;
        this.moveLog.type = cell?.prize > 0 ? "moveWithIncreasingPrize" : "moveWithDecreasingPrize";
      }
    } else {
      newPrize += 0;
      this.moveLog.jackpotWinner = false;
      this.moveLog.type = "moveWithoutBonus";
    }
    this.moveLog.currentPrize = newPrize;
    return newPrize;
  }
}
