class Player {
  constructor(nickname, player) {
    this.nickname = nickname;
    this.position = player?.position ?? 0;
    this.previousPosition = player?.previousPosition ?? 0;
    this.previousPrize = player?.previousPrize ?? configurationService.getConfig().labyrinth.initialCashValue;
    this.prize = player?.prize ?? configurationService.getConfig().labyrinth.initialCashValue;
    this.jackpot = false;
    this.bonuses = player?.bonuses ?? [];
    this.movesHistory = player?.movesHistory ?? [];
  }

  getCurrentPosition() {
    return this.position;
  }

  getCurrentPrize() {
    return this.prize;
  }

  getFullPrize() {
    return this.getCurrentPrize() + this.bonuses.reduce((amount, bonus) => amount + bonus.prize, 0);
  }

  getBonuses() {
    return this.bonuses;
  }

  getBonusByName(name) {
    return this.bonuses.find((bonus) => bonus.name === name);
  }

  hasJackpot() {
    return this.getBonuses().some((bonus) => bonus.name === bonuses.JACKPOT.name);
  }

  move(moveObject) {
    this.previousPrize = this.getCurrentPrize();
    this.previousPosition = this.getCurrentPosition();
    this.position = moveObject.currentPosition;
    this.prize = moveObject.prize;
    this.movesHistory.push({ position: moveObject.currentPosition, cell: structuredClone(moveObject.cell) });
  }

  setBonus(bonus) {
    this.bonuses.push(bonus);
  }
}
