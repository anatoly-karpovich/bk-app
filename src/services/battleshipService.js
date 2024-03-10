class BattleShipsService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  startGame(board, shipsCoordinates) {
    const game = {
      board,
      shipsCoordinates,
      moves: [],
    };
    this.saveGame(game);
  }

  saveMove(move) {
    const storedGameData = this.dataStorageService.getGameData("battleShips");
    if (!storedGameData.game) {
      storedGameData.game = {};
    }
    storedGameData.game.moves.push(move);
    this.saveGame(storedGameData.game);
  }

  undoLastMove() {
    const storedGameData = this.dataStorageService.getGameData("battleShips");
    if (!storedGameData.game) {
      storedGameData.game = {};
    }
    storedGameData.game.moves.pop();
    this.saveGame(storedGameData.game);
  }

  saveGame(game) {
    const storedGameData = this.dataStorageService.getGameData("battleShips");
    if (!storedGameData.game) {
      storedGameData.game = {};
    }
    storedGameData.game = game;
    this.dataStorageService.setGameData("battleShips", JSON.stringify(storedGameData));
  }

  getGame() {
    const storedGameData = this.dataStorageService.getGameData("battleShips");
    if (!storedGameData || !storedGameData.game || storedGameData.game === "{}") return {};
    return storedGameData.game;
  }

  deleteGame() {
    const storedGameData = this.dataStorageService.getGameData("battleShips");
    if (!storedGameData.game) return;
    storedGameData.game = {};
    this.dataStorageService.setGameData("battleShips", JSON.stringify(storedGameData));
  }

  getAppliedConfig() {
    const generalConfig = configurationService.getConfigForGame("battleShips");
    const selectedBoardSize = generalConfig.selectedBoardSize;
    return generalConfig.boards[selectedBoardSize];
  }
}

const battleShipsService = new BattleShipsService();
