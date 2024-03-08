class DJService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  setDJName(nickname) {
    if (!nickname) throw new Error("Invalid DJ's nickname");
    this.dataStorageService.setGameData("djName", { nickname });
  }

  getDJName() {
    return this.dataStorageService.getGameData("djName").nickname;
  }

  deleteDJName() {}
}
