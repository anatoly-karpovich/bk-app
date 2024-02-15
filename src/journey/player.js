class Player {
  constructor(nickname) {
    this.nickname = nickname;
    this.position = 0;
    this.previousPosition = 0;
    this.previousPrize = configuration.initialCashValue;
    this.prize = configuration.initialCashValue;
    this.jackpot = false;
    this.bonuses = [];
    this.movesHistory = [];
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
    this.movesHistory.push({ position: moveObject.currentPosition, cell: moveObject.cell });
  }

  setBonus(bonus) {
    this.bonuses.push(bonus);
  }
}
