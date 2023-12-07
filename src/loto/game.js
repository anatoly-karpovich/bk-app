class LotoGame {
  #findNumberMethod;
  #cards = {};
  #foundNumbers = [];
  #lotoService;
  constructor(cards = {}, foundNumbers = []) {
    this.#cards = cards;
    this.#foundNumbers = [...foundNumbers];
    this.#findNumberMethod = getUniqueRandomNumber(lotoConfig.min, lotoConfig.max, foundNumbers);
    this.#lotoService = lotoService;
    this.saveGameProgress();
  }

  getCards() {
    return this.#cards;
  }

  getFoundNumbers() {
    return this.#foundNumbers;
  }

  saveGameProgress() {
    this.#lotoService.saveGame({ cards: this.getCards(), foundNumbers: this.getFoundNumbers() });
  }

  findNextNumber() {
    const nextNumber = this.#findNumberMethod();
    this.#foundNumbers.push(nextNumber);
    this.saveGameProgress();
    if (this.isGameOver()) {
      this.#lotoService.deleteGame();
    }
    return nextNumber;
  }

  isGameOver() {
    const result = {};
    let shouldFinish = false;
    for (const nickName of Object.keys(this.#cards)) {
      result[nickName] = 0;
      this.#cards[nickName].forEach((el) => {
        if (!this.#foundNumbers.includes(el)) {
          result[nickName]++;
        }
      });
      if (result[nickName] === 0) {
        shouldFinish = true;
      }
    }
    return shouldFinish ? this.#handleWinners(result) : shouldFinish;
  }

  #handleWinners(resultObject) {
    let result = ``;
    for (let i = 0; i < 15; i++) {
      if (Object.values(resultObject).includes(i)) {
        result +=
          `${i === 0 ? "Всё закрыли" : i + ` не закрыли`}: ${Object.entries(resultObject)
            .filter((pair) => pair[1] === i)
            .map((e) => e[0])
            .join(", ")}` + "\n";
      }
    }
    return result;
  }
}
