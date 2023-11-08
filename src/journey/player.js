class Player {
  constructor(nickname) {
    this.nickname = nickname;
    this.position = 0;
    this.prize = configuration.initialCashValue;
  }
  getCurrentPosition() {
    return this.position;
  }

  getCurrentPrize() {
    return this.prize;
  }

  move(moveObject) {
    this.position = moveObject.cell;
    this.prize = moveObject.prize;
  }
}
