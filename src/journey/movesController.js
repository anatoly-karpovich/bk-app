class MovesController {
  moveIndex;
  constructor(map) {
    this.map = map;
    this.movesService = new MovesService(map);
    this.achivementsService = new AchievementsService();
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
    moves.forEach((playerMove) => {
      const move = this.movesService.handleMove(playerMove.player, playerMove.dice);
      this.#getMoveLogElementByPlayerNickname(move.player.nickname).push(move);
    });
  }

  handleJackpot() {
    const playersOnJackpotCells = this.#getPlayersOnJackpotCells();
    if (Object.values(playersOnJackpotCells).every((el) => !el.length)) return;

    for (const [index, players] of Object.entries(playersOnJackpotCells)) {
      if (!players.length) continue;

      const cell = this.map.getMap()[index];
      if (!cell.winner) {
        const playersWithoutJackpotOnCell = players.filter((p) => !p.getBonuses().some((bonus) => bonus.name === bonuses.JACKPOT.name));

        if (!playersWithoutJackpotOnCell.length) continue;

        const jackpotWinner = playersWithoutJackpotOnCell[generateNumberInRange(0, playersWithoutJackpotOnCell.length - 1)];
        this.map.setJackpotWinnerOnCell(index, jackpotWinner);
        this.movesLog[jackpotWinner.nickname][0].type = MOVE_TYPES.MOVE_WITH_JACKPOT;
      }
      const playersWithoutJackpot = players.filter((p) => p.nickname !== cell.winner.nickname);
      playersWithoutJackpot.forEach((player) => {
        this.movesLog[player.nickname][0].type = MOVE_TYPES.MOVE_WITH_EMPTY_JACKPOT;
      });
    }
  }

  handleAchievements() {
    Object.keys(this.movesLog).forEach((nickname) => {
      const achivements = this.achivementsService.getNewAchivementsForPlayer(this.movesLog[nickname][0]);
      this.movesLog[nickname][0].achivements = achivements.map((b) => b.achivement);
      if (achivements.length) {
        this.movesLog[nickname].push(...achivements);
      }
    });
  }

  applyMoves() {
    for (const nickname in this.movesLog) {
      this.movesLog[nickname][0].player.move(this.movesLog[nickname][0]);
      if (this.movesLog[nickname][0].type === MOVE_TYPES.MOVE_WITH_JACKPOT) {
        this.movesLog[nickname][0].player.setBonus(bonuses.JACKPOT);
      }
      const achivementMoves = this.movesLog[nickname].filter((m) => m.type === MOVE_TYPES.MOVE_TO_ACHIVEMENT);
      if (achivementMoves.length) {
        achivementMoves.forEach((move) => {
          this.movesLog[nickname][0].player.setBonus(move.achivement);
        });
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

  #getPlayersOnJackpotCells() {
    const jackPotCellIndexArray = this.map.getJackpotCells();
    const playersOnJackpotCells = jackPotCellIndexArray.reduce((playersOnCells, index) => {
      const nicknames = Object.values(this.movesLog)
        .filter((move) => move[0].currentPosition === index)
        .map((move) => move[0].player);
      playersOnCells[index] = nicknames;
      return playersOnCells;
    }, {});
    return playersOnJackpotCells;
  }
}
