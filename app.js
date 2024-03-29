const state = { quiz: {}, loto: { foundNumbers: [], cards: [] }, labyrinth: {}, battleships: {} };
handleDJsName();
renderBotanPage();
const dataStorageService = new DataStorageService();
dataStorageService.setInitialRouts();

const storedConfig = configurationService.getConfig();
if (!storedConfig || !Object.keys(storedConfig).length) {
  configurationService.setConfig(initialConfig);
}

function sideMenuClickHandler(page) {
  switch (page) {
    case "Home":
      break;

    case "Quiz":
      renderQuizPage();
      break;

    case "Loto":
      renderLotoPage();
      break;

    case "Labyrinth":
      renderLabyrinthPage();
      break;

    case "Botan":
      renderBotanPage();
      break;

    case "Battleship":
      renderBattleshipPage();
      break;

    case "Configuration":
      renderConfigurationPage();
      break;
  }
}
