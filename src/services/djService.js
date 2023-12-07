class DJService {
  constructor(dataStorageService = DataStorageService) {
    this.dataStorageService = new dataStorageService();
  }

  setDJName(nickname) {
    if (!nickname) throw new Error("Invalid DJ's nickname");
    this.dataStorageService.setValueByKey("djName", { nickname });
  }

  getDJName() {
    return this.dataStorageService.getValueByKey("djName").nickname;
  }

  deleteDJName() {
    const dj = this.getDJName();
    this.dataStorageService.setValueByKey("djName", { nickname: null });
  }
}
