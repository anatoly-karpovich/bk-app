class ConfigurationService {
  constructor() {
    this.dataStorageService = new DataStorageService();
  }

  setConfig(config) {
    if (!config) throw new Error("Config was not provided");
    this.dataStorageService.setGameData("config", JSON.stringify(config));
  }

  getConfig() {
    return this.dataStorageService.getGameData("config") ?? {};
  }

  getConfigForGame(section) {
    return this.getConfig()[section];
  }

  setConfigForGame(section, newConfigForSection) {
    const config = this.getConfig();
    config[section] = newConfigForSection;
    this.setConfig(config);
  }
}

const configurationService = new ConfigurationService();
