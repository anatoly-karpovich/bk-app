class DataStorageService {
  constructor() {
    this.storage = localStorage;
  }
  #setValueByKey(key, value) {
    this.storage.setItem(key, value);
  }

  #getValueByKey(key) {
    const value = this.storage.getItem(key);
    return value;
  }

  setGameData(gameName, gameData) {
    this.#setValueByKey(gameName, gameData);
  }

  getGameData(gameName) {
    const gameData = this.#getValueByKey(gameName);
    return JSON.parse(gameData);
  }

  removeItemByKey(key) {
    this.storage.removeItem(key);
  }

  setInitialRouts() {
    const games = ["loto", "labyrinth"];
    for (const game of games) {
      const gameData = this.#getValueByKey(game);
      if (!gameData) this.#setValueByKey(game, "{}");
    }
  }
}
