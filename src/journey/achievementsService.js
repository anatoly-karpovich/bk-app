class AchievementsService {
  newBonusesForPlayer = [];
  bonuses = structuredClone(bonuses);
  getNewAchivementsForPlayer(move) {
    this.newBonusesForPlayer = [];
    this.handleUnlucky(move);
    this.handleCareful(move);
    this.handleCollector(move);
    this.handleLucky(move);
    return this.newBonusesForPlayer;
  }

  handleUnlucky(move) {
    if (move.player.movesHistory.length <= 1) {
      return;
    }
    const lastMoves = move.player.movesHistory.slice(move.player.movesHistory.length - 2, move.player.movesHistory.length);
    const shoudAchive = lastMoves.every((el) => el.cell && el.cell.prize < 0) && move.cell && move.cell.prize < 0;
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.UNLUCKY.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.UNLUCKY, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }

  handleCareful(move) {
    if (move.player.movesHistory.length <= 1) {
      return;
    }

    const lastMoves = [...move.player.movesHistory.slice(move.player.movesHistory.length - 2, move.player.movesHistory.length), { position: move.currentPosition, cell: move.cell }];
    const shoudAchive = lastMoves.every((el) => {
      let isValidForAchievement = true;
      if (el.cell) {
        if (el.cell.prize) {
          isValidForAchievement = false;
        }
        if (el.cell.winner && el.cell.winner.nickname === move.player.nickname) {
          isValidForAchievement = false;
        }
        if (move.type === "moveWithJackpot") {
          isValidForAchievement = false;
        }
      }
      if (move.currentPosition == configurationService.getConfig().labyrinth.finishPosition) {
        isValidForAchievement = false;
      }
      return isValidForAchievement;
    });
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.CAREFUL.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.CAREFUL, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }

  handleCollector(move) {
    const uniqueCells = [...new Set(bonusesArray.map((e) => JSON.stringify(e)))].map((e) => JSON.parse(e)).filter((e) => !e.isJackPot);
    if (move.player.movesHistory.length < uniqueCells.length - 1) {
      return;
    }
    const moves = [...structuredClone(move.player.movesHistory), { cell: move.cell }];
    const shoudAchive =
      uniqueCells.every((cell) => {
        return moves.some((el) => el.cell && el.cell.prize === cell.prize);
      }) && moves.some((el) => !el.cell);
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.COLLECTOR.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.COLLECTOR, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }

  handleLucky(move) {
    if (move.player.movesHistory.length < 4) {
      return;
    }
    const lastMoves = move.player.movesHistory.slice(move.player.movesHistory.length - 4, move.player.movesHistory.length);
    const shoudAchive = lastMoves.every((el) => el.cell && el.cell.prize > 0) && move.cell && move.cell.prize > 0;
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.LUCKY.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.LUCKY, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }
}
