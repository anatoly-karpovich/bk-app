const state = { quiz: {}, loto: { foundNumbers: [], cards: [] }, labyrinth: {} };

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
  }
}
