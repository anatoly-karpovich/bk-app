const state = { quiz: {}, loto: { foundNumbers: [], cards: [] }, labyrinth: {} };
handleDJsName();
renderBotanPage();
const dataStorageService = new DataStorageService();
dataStorageService.setInitialRouts();

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
  }
}
