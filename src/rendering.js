function renderPageContent(layout) {
  const contentWrapper = document.getElementById("contentWrapper");
  contentWrapper.innerHTML = layout;
}

function renderQuizPage() {
  const layout = createQuizPageLayout();
  renderPageContent(layout);
  addEventListenersToQuizPage();
  sideMenuActivateElement("Quiz");
}

function renderLotoPage() {
  const layout = createLotoPageLayout();
  renderPageContent(layout);
  addEventListenersToLotoPage();
  sideMenuActivateElement("Loto");
}

function renderBotanPage() {
  const layout = createBotanLayout();
  renderPageContent(layout);
  addEventListenersToBotanPage();
  sideMenuActivateElement("Botan");
}

function renderLabyrinthPage() {
  const layout = createLabyrinthPageLayout();
  renderPageContent(layout);
  addEventListenersToLabyrinthPage();
  sideMenuActivateElement("Labyrinth");
  state.labyrinth = {};
}

function sideMenuActivateElement(value) {
  const li = document.querySelectorAll(`ul.nav a`);
  li.forEach((el) => {
    if (el.classList.contains("active")) el.classList.remove("active");
  });
  const index = findNodeIndexByInnerText(`ul.nav a`, value);
  li[index].classList.add("active");
}

function findNodeIndexByInnerText(selector, value) {
  const nodes = document.querySelectorAll(selector);
  const values = [];
  nodes.forEach((el) => {
    values.push(el.innerText.trim());
  });
  return values.findIndex((el) => el === value);
}
