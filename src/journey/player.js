class Player {
  constructor(nickname) {
    this.nickname = nickname;
    this.position = 0;
    this.previousPosition = 0;
    this.previousPrize = configuration.initialCashValue;
    this.prize = configuration.initialCashValue;
    this.jackpot = false;
  }
  getCurrentPosition() {
    return this.position;
  }

  getCurrentPrize() {
    return this.prize;
  }

  hasJackpot() {
    return this.jackpot;
  }

  move(moveObject, jackpot = false) {
    this.previousPrize = this.getCurrentPrize();
    this.previousPosition = this.getCurrentPosition();
    this.position = moveObject.cell;
    this.prize = moveObject.prize;
    if (jackpot) {
      this.jackpot = true;
    }
  }
}
