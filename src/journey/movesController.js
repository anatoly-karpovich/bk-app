class MovesController {
  moveIndex;
  constructor(map) {
    this.map = map;
    this.movesService = new MovesService(map);
    this.movesLog = {};
  }

  makeMoves(moves, moveIndex) {
    try {
      this.moveIndex = moveIndex;
      this.handleMoves(moves);
      this.handleJackpot();
      this.handleAchievements();
      this.applyMoves();
      this.logMoves();
    } catch (e) {
      console.log(e);
    } finally {
      this.clearMove();
    }
  }

  handleMoves(moves) {
    moves.forEach((palyerMove) => {
      const move = this.movesService.handleMove(palyerMove.player, palyerMove.dice);
      move.player = palyerMove.player;
      this.#getMoveLogElementByPlayerNickname(move.player.nickname).push(move);
    });
  }

  handleJackpot() {
    const playersOnJackpotCell = [...this.#getPlayersOnJackpotCell()];
    if (!playersOnJackpotCell.length) return;
    if (!Game.jackpot.isObtained) {
      const jackpotWinner = playersOnJackpotCell[generateNumberInRange(0, playersOnJackpotCell.length - 1)];
      Game.jackpot.winner = jackpotWinner;
      Game.jackpot.isObtained = true;
      this.movesLog[jackpotWinner][0].type = MOVE_TYPES.MOVE_WITH_JACKPOT;
    }
    const playersWithoutJackpot = playersOnJackpotCell.filter((p) => p !== Game.jackpot.winner);
    playersWithoutJackpot.forEach((player) => {
      this.movesLog[player][0].type = MOVE_TYPES.MOVE_WITH_EMPTY_JACKPOT;
    });
    return;
  }

  handleAchievements() {
    return;
  }

  applyMoves() {
    for (const nickname in this.movesLog) {
      this.movesLog[nickname][0].player.move(this.movesLog[nickname][0]);
      if (this.movesLog[nickname][0].type === MOVE_TYPES.MOVE_WITH_JACKPOT) {
        this.movesLog[nickname][0].player.setBonus(bonuses.JACKPOT);
      }
      if (this.movesLog[nickname][0].bonuses) {
        this.movesLog[nickname][0].bonuses.forEach((bonus) => this.movesLog[nickname][0].player.setBonus(bonus));
      }
    }
  }

  logMoves() {
    Game.logger.logMoves(this.movesLog);
    return;
  }

  clearMove() {
    this.movesLog = {};
  }

  #getMoveLogElementByPlayerNickname(nickname) {
    if (!this.movesLog[nickname]) {
      this.movesLog[nickname] = [];
    }
    return this.movesLog[nickname];
  }

  #getPlayersOnJackpotCell() {
    const jackPotCellIndex = this.map.getJackpotCell();
    const nicknames = Object.keys(this.movesLog).filter((key) => this.movesLog[key][0].currentPosition === jackPotCellIndex);
    return nicknames;
  }
}
