class JourneyService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  startGame(players, map) {
    const game = {
      players: players,
      moves: {},
      map: map ?? {},
    };
    this.saveGame(game);
  }

  saveGame(game) {
    let storedGame = this.#getGameData();
    if (!storedGame) storedGame = {};
    if (!storedGame.game) {
      storedGame.game = {};
    }
    storedGame.game = game;
    this.dataStorageService.setGameData("labyrinth", JSON.stringify(storedGame));
  }

  saveMove(moveOptions) {
    const storedGame = this.getGame();
    if (!storedGame) console.error("Labyrinth game not found");

    if (!storedGame.moves) {
      storedGame.moves = {};
    }
    if (!storedGame.moves[Game.moveIndex]) {
      storedGame.moves[Game.moveIndex] = {};
    }
    storedGame.moves[Game.moveIndex][moveOptions.player] = moveOptions;
    this.saveGame(storedGame);
  }

  #getGameData() {
    let storedGame = this.dataStorageService.getGameData("labyrinth");
    if (!storedGame || !storedGame.game || storedGame.game === "{}") {
      storedGame = {};
      storedGame.game = { moves: {}, players: [], map: {} };
    }
    return storedGame;
  }

  getGame() {
    const gameData = this.#getGameData();
    return gameData.game;
  }

  getPlayers() {
    const gameData = this.#getGameData();
    return gameData.players;
  }

  deleteGame() {
    const storedGame = this.getGame();
    if (!storedGame || !storedGame.game) return;
    storedGame.game = {};
    this.dataStorageService.setGameData("labyrinth", JSON.stringify(storedGame));
  }
}

const journeyService = new JourneyService();
