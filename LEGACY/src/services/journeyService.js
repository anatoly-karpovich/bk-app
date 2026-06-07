class JourneyService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  #createEmptyGame() {
    return {
      game: {
        moves: {},
        players: [],
        map: {},
        comments: [],
      },
    };
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
    storedGame.moves[Game.moveIndex][moveOptions.player.nickname] = moveOptions;
    this.saveGame(storedGame);
  }

  saveGameComments(comments) {
    const storedGame = this.getGame();
    if (!storedGame) console.error("Labyrinth game not found");
    if (!storedGame.comments) storedGame.comments = [];

    storedGame.comments = comments;
    this.saveGame(storedGame);
  }

  saveMap(map) {
    const storedGame = this.getGame();
    storedGame.map = map;
    this.saveGame(storedGame);
  }

  #getGameData() {
    let storedGame = this.dataStorageService.getGameData("labyrinth");
    if (!storedGame || !storedGame.game || storedGame.game === "{}") {
      storedGame = this.#createEmptyGame();
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
    this.dataStorageService.setGameData("labyrinth", JSON.stringify(this.#createEmptyGame()));
  }
}

const journeyService = new JourneyService();
