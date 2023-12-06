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
    <div class="d-flex justify-content-start">
      <div class="mb-3 me-5" style="width:30%">
        <button class="btn btn-primary" id="start-loto-btn" disabled>Start</button>
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
  const lotoContainer = document.getElementById("container");
  const addLotoPlayerBtn = document.getElementById("add-loto-player-btn");
  const inputsContainer = document.getElementById("players-inputs");
  const getNextNumberButton = document.getElementById("get-next-number-btn");
  const lotoLogTextarea = document.getElementById("loto-log");

  state.loto.foundNumbers = [];
  state.loto.cards = {};

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
    enableOrDisableElement(startButton, false);
    enableOrDisableElement(addLotoPlayerBtn, false);
    const cards = getLotoCards();
    const numberOfLotoPlayers = Object.keys(cards).length;
    if (!numberOfLotoPlayers) {
      lotoContainer.innerHTML = "";
      lotoLogTextarea.value = "";
      state.loto.cards = {};
      state.loto.foundNumbers = [];
      return;
    }

    if (Object.keys(state.loto.cards).length) {
      for (const key of Object.keys(state.loto.cards)) {
        if (!Object.keys(cards).includes(key)) {
          delete state.loto.cards[key];
        }
      }
    }
    lotoContainer.innerHTML = generateLotoCardsForPlayers({ ...cards, ...state.loto.cards });
    state.loto.cards = { ...cards, ...state.loto.cards };
    state.loto.foundNumbers = [];
    getNextNumberButton.removeAttribute("disabled");
    lotoLogTextarea.value = "";
  });

  getNextNumberButton.addEventListener("click", (event) => {
    event.preventDefault();
    let newNumber = generateNumberInRange();
    while (state.loto.foundNumbers.includes(newNumber)) {
      newNumber = generateNumberInRange();
    }
    state.loto.foundNumbers.push(newNumber);
    lotoLogTextarea.value += `${state.loto.foundNumbers.length === 1 ? "Первое" : "Следующее"} выпавшее число: ${newNumber}` + "\n";
    handleNextNumber(newNumber);
    const gameResult = checkForWinner();
    if (gameResult) {
      getNextNumberButton.setAttribute("disabled", "");
      lotoLogTextarea.value += `Игра завершилась за ${state.loto.foundNumbers.length} ходов!\n`;
      lotoLogTextarea.value += gameResult;
    }
  });

  function getLotoCards() {
    const cards = {};
    const cardContainers = [...document.querySelectorAll(`[name="loto-player"]`)];
    for (const cardContainer of cardContainers) {
      const playerName = cardContainer.querySelector(`input[name="player-nickname"]`).value;
      const playerNumbersFromInput = cardContainer.querySelector(`input[name="card-numbers"]`).value;
      cards[playerName] = getNumbersFromString(playerNumbersFromInput);
    }
    return cards;
  }

  function handleNextNumber(nextNumber) {
    const tables = [...document.querySelectorAll("table")];
    tables.forEach((table) => {
      const id = table.id;
      if (state.loto.cards[id].includes(nextNumber)) {
        const index = state.loto.cards[id].indexOf(nextNumber);
        table.querySelector(`tbody > tr > td:nth-of-type(${index + 1}`).classList.add("table-success");
      }
    });
  }

  function checkForWinner() {
    const result = {};
    let shouldFinish = false;
    for (const nickName of Object.keys(state.loto.cards)) {
      result[nickName] = 0;
      state.loto.cards[nickName].forEach((el) => {
        if (!state.loto.foundNumbers.includes(el)) {
          result[nickName]++;
        }
      });
      if (result[nickName] === 0) {
        shouldFinish = true;
      }
    }
    return shouldFinish ? handleWinners(result) : shouldFinish;
  }

  function handleWinners(obj) {
    let result = ``;
    for (let i = 0; i < 15; i++) {
      if (Object.values(obj).includes(i)) {
        result +=
          `${i === 0 ? "Всё закрыли" : i + ` не закрыли`}: ${Object.entries(obj)
            .filter((pair) => pair[1] === i)
            .map((e) => e[0])
            .join(", ")}` + "\n";
      }
    }
    return result;
  }
}

function generateLotoPlayerInput() {
  const id = window.crypto.randomUUID();
  return `
  <div class="mb-3 d-flex justify-content-between" data-id="${id}">
    <div class="col-md-11 d-flex juxtify-content-around" name="loto-player">
      <div class="me-2" style="width: 30%">${generateTextInput({ placeholder: "Enter players nickname", id: id, name: "player-nickname" }, validationErrorMessages.NICKHANE)}</div>
      <div style="width: 70%">${generateTextInput({ placeholder: "Enter players numbers devided by comma", id: id, name: "card-numbers" }, validationErrorMessages.LOTO_NUMBERS)}</div>
    </div>
    <div class="col-md-1 delete-in-modal">
      <button class="btn btn-link text-danger del-btn-modal" title="Remove Player" name="delete-loto-player" data-delete-id="${id}">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  </div>
  `;
}

function validateLotoNumbersInputs(inputs) {
  let isValid = true;
  for (const input of inputs) {
    const numbers = getNumbersFromString(input.value);
    if (validateArrayOnNumbersToHaveOnlyNumbersInRange(numbers) && numbers.length === 10 && numbers.length === [...new Set(numbers)].length) {
      makeInputInvalidOrValid(input, true);
    } else {
      isValid = false;
      makeInputInvalidOrValid(input, false);
    }
  }
  return isValid;
}
