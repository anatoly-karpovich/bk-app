class MovesService {
  constructor(map) {
    this.map = map;
    this.move = {};
  }

  handleMove(player, dice) {
    this.move = {};
    this.move.player = player;
    this.move.dice = dice;
    this.move.previousPosition = player.getCurrentPosition();
    this.move.previousPrize = player.getCurrentPrize();
    if (player.getCurrentPosition() === configurationService.getConfig().labyrinth.finishPosition) {
      return;
    }
    this.handleNewCell();
    this.handleNewPrize();
    return this.move;
  }

  handleNewCell() {
    const currentPosition = this.move.player.getCurrentPosition();
    let nextPosition = this.getNewPositionIndex(currentPosition, this.move.dice);
    const cell = this.map.getMap()[nextPosition];
    if (cell) {
      nextPosition = nextPosition + this.map.getMap()[nextPosition]?.cellChange;
    }
    this.move.currentPosition = nextPosition;
  }

  handleNewPrize() {
    const cell = this.map.getMap()[this.move.currentPosition];
    let newPrize = this.move.player.getCurrentPrize();
    this.move.cell = cell ?? null;
    if (cell && cell.prize) {
      if (newPrize < configurationService.getConfig().labyrinth.maxPrize && newPrize + cell.prize > configurationService.getConfig().labyrinth.maxPrize) {
        newPrize = configurationService.getConfig().labyrinth.maxPrize;
        this.move.type = MOVE_TYPES.MOVE_TO_MAX_PRIZE;
      } else if (newPrize + cell.prize > configurationService.getConfig().labyrinth.maxPrize) {
        this.move.type = MOVE_TYPES.MOVE_WITN_MAX_PRIZE;
      } else if (newPrize >= 0 && newPrize + cell.prize < 0) {
        this.move.type = newPrize ? MOVE_TYPES.MOVE_TO_ZERO_PRIZE : MOVE_TYPES.MOVE_WITH_ZERO_PRIZE;
        newPrize = 0;
      } else {
        newPrize += cell.prize;
        this.move.jackpotWinner = false;
        this.move.type = cell?.prize > 0 ? MOVE_TYPES.MOVE_WITH_INCREASING_PRIZE : MOVE_TYPES.MOVE_WITH_DECREASING_PRIZE;
      }
    } else {
      newPrize += 0;
      this.move.jackpotWinner = false;
      this.move.type = MOVE_TYPES.MOVE_WITHOUT_BONUS;
    }
    if (this.move.currentPosition > configurationService.getConfig().labyrinth.mapSize) {
      this.move.type = MOVE_TYPES.MOVE_TO_FINISH;
    }
    this.move.prize = newPrize;
  }

  getNewPositionIndex(currentPosition, dice) {
    return currentPosition + dice >= configurationService.getConfig().labyrinth.finishPosition ? configurationService.getConfig().labyrinth.finishPosition : currentPosition + dice;
  }
}
