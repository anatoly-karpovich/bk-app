function createLotoPageLayout() {
  return `
  <div id="header">
    <div class="d-flex justify-content-start">
      <div class="border border-dark mb-5 me-5" style="width:50%">
          <div class="p-5">    
            <label for="players-inputs" class="form-label">Loto Players</label>
            <div id="players-inputs" class="mb-3">
              ${generateLotoPlayerInput()}
            </div>
            <div>
              <button id="add-loto-player-btn" class="btn btn-outline-primary form-buttons">Add Player</button>
            </div>
          </div>
        </div>
        <div id="loto-log-div" class="border border-dark mb-5 me-5" style="width:30%">
          <textarea class="form-control" id="loto-log" style=" width: 100%; height: 100%;" type="text"></textarea>
        </div>
      </div>
    <div class="d-flex justify-content-between">
      <div class="mb-3 me-5" style="width:30%">
        <button class="btn btn-primary me-5" id="start-loto-btn" disabled>Start</button>
        <button class="btn btn-success" id="restore-loto-btn">Restore Game</button>
      </div>
      <div class="mb-3 me-5" style="width:30%">
        <button class="btn btn-primary" id="get-next-number-btn" disabled>Next Number!</button>
      </div>
    </div>
  </div>
  <div id="container"></div>
`;
}

function addEventListenersToLotoPage() {
  const startButton = document.getElementById("start-loto-btn");
  const restoreButton = document.getElementById("restore-loto-btn");
  const lotoContainer = document.getElementById("container");
  const addLotoPlayerBtn = document.getElementById("add-loto-player-btn");
  const inputsContainer = document.getElementById("players-inputs");
  const getNextNumberButton = document.getElementById("get-next-number-btn");
  const lotoLogTextarea = document.getElementById("loto-log");

  handleRestoreLoto(restoreButton);

  restoreButton.addEventListener("click", () => {
    inputsContainer.innerHTML = generateLotoPlayerInput();
    enableOrDisablePlayersNamesSection(false);
    const savedGame = lotoService.getGame();
    const game = new LotoGame(savedGame.cards, savedGame.foundNumbers);
    state.loto.game = game;

    lotoContainer.innerHTML = generateLotoCardsForPlayers(game.getCards());
    getNextNumberButton.removeAttribute("disabled");
    lotoLogTextarea.value = "";
    for (const num of game.getFoundNumbers()) {
      displayFoundNumber(num, lotoLogTextarea);
      handleNextNumber(num);
    }
  });

  lotoContainer.addEventListener("click", (event) => {
    event.preventDefault();
    const id = event.target.getAttribute("data-header-id");
    if (id) {
      const numbers = [...document.querySelectorAll(`div[data-id="${id}"] tr > td`)].map((el) => el.textContent).join(", ");
      console.log(numbers);
      copyToClipboard(numbers);
    }
  });

  inputsContainer.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.name === "delete-loto-player") {
      if ([...document.querySelectorAll(".del-btn-modal")].length > 1) {
        const id = event.target.getAttribute("data-delete-id");
        const el = document.querySelector(`div[data-id="${id}"]`);
        el.parentNode.removeChild(el);
      }
    }
  });

  inputsContainer.addEventListener("input", (event) => {
    let isValid = true;
    if (event.target.name === "player-nickname" || event.target.name === "card-numbers") {
      const playerNameInputs = [...document.querySelectorAll(`[name="player-nickname"]`)];
      const playerNumbersInputs = [...document.querySelectorAll(`[name="card-numbers"]`)];
      const isValidPlayers = validatePlayerInputsValues(playerNameInputs);
      const isValidNumbers = validateLotoNumbersInputs(playerNumbersInputs);
      if (!isValidPlayers || !isValidNumbers) isValid = false;
    }
    enableOrDisableElement(startButton, isValid);
  });

  addLotoPlayerBtn.addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableElement(startButton, false);
    inputsContainer.insertAdjacentHTML("beforeend", generateLotoPlayerInput());
  });

  startButton.addEventListener("click", () => {
    const cards = getLotoCards();

    const numberOfLotoPlayers = Object.keys(cards).length;
    if (!numberOfLotoPlayers) {
      lotoContainer.innerHTML = "";
      lotoLogTextarea.value = "";
      return;
    }

    const game = new LotoGame(cards, []);
    state.loto.game = game;

    lotoContainer.innerHTML = generateLotoCardsForPlayers(game.getCards());
    getNextNumberButton.removeAttribute("disabled");
    lotoLogTextarea.value = "";
    inputsContainer.innerHTML = generateLotoPlayerInput();
    enableOrDisablePlayersNamesSection(false);
  });

  getNextNumberButton.addEventListener("click", (event) => {
    event.preventDefault();
    let newNumber = state.loto.game.findNextNumber();
    displayFoundNumber(newNumber, lotoLogTextarea);
    handleNextNumber(newNumber);
    const gameResult = state.loto.game.isGameOver();
    if (gameResult) {
      getNextNumberButton.setAttribute("disabled", "");
      lotoLogTextarea.value += `Игра завершилась за ${state.loto.game.getFoundNumbers().length} ходов!\n`;
      lotoLogTextarea.value += gameResult;
    }
  });
}
