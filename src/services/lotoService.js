class LotoService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  saveGame(game) {
    const storedLoto = this.dataStorageService.getGameData("loto");
    if (!storedLoto.game) {
      storedLoto.game = {};
    }
    storedLoto.game = game;
    this.dataStorageService.setGameData("loto", JSON.stringify(storedLoto));
  }

  getGame() {
    const storedLoto = this.dataStorageService.getGameData("loto");
    if (!storedLoto.game || storedLoto.game === "{}") return;
    return storedLoto.game;
  }

  deleteGame() {
    const storedLoto = this.dataStorageService.getGameData("loto");
    if (!storedLoto.game) return;
    storedLoto.game = {};
    this.dataStorageService.setGameData("loto", JSON.stringify(storedLoto));
  }
}

const lotoService = new LotoService();
