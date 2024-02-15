class AchievementsService {
  newBonusesForPlayer = [];
  bonuses = structuredClone(bonuses);
  getNewAchivementsForPlayer(move) {
    this.newBonusesForPlayer = [];
    this.handleUnlucky(move);
    this.handleCareful(move);
    return this.newBonusesForPlayer;
  }

  handleUnlucky(move) {
    if (move.player.movesHistory.length <= 1) {
      return;
    }
    const lastMoves = move.player.movesHistory.slice(move.player.movesHistory.length - 2, move.player.movesHistory.length);
    const shoudAchive = lastMoves.every((el) => el.cell && el.cell.prize < 0) && move.cell.prize < 0;
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.UNLUCKY.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.UNLUCKY, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }

  handleCareful(move) {
    if (move.player.movesHistory.length <= 1) {
      return;
    }
    const lastMoves = move.player.movesHistory.slice(move.player.movesHistory.length - 2, move.player.movesHistory.length);
    const shoudAchive = lastMoves.every((el) => !el.cell) && !move.cell;
    if (shoudAchive && !move.player.getBonusByName(this.bonuses.CAREFUL.name)) {
      this.newBonusesForPlayer.push({ achivement: this.bonuses.CAREFUL, type: MOVE_TYPES.MOVE_TO_ACHIVEMENT, player: move.player });
    }
  }
}
