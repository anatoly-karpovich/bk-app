function validateLotoNumbersInputs(inputs) {
  let isValid = true;
  for (const input of inputs) {
    const numbers = getNumbersFromString(input.value);
    if (
      validateArrayOnNumbersToHaveOnlyNumbersInRange(numbers) &&
      numbers.length === configurationService.getConfigForGame("loto").cardNumbersAmount &&
      numbers.length === [...new Set(numbers)].length
    ) {
      makeInputInvalidOrValid(input, true);
    } else {
      isValid = false;
      makeInputInvalidOrValid(input, false);
    }
  }
  return isValid;
}

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
    if (state.loto.game.getCards()[id].includes(nextNumber)) {
      const index = state.loto.game.getCards()[id].indexOf(nextNumber);
      table.querySelector(`tbody > tr > td:nth-of-type(${index + 1}`).classList.add("table-success");
    }
  });
}

function handleRestoreLoto(restoreButton) {
  const savedGame = lotoService.getGame();
  const isGameSaved = !!Object.keys(savedGame).length;

  enableOrDisableElement(restoreButton, isGameSaved);
}

function displayFoundNumber(newNumber, lotoLogTextarea) {
  lotoLogTextarea.value += `${state.loto.game.getFoundNumbers().length === 1 ? "Первое" : "Следующее"} выпавшее число: ${newNumber}` + "\n";
}

function enableOrDisablePlayersNamesSection(enable) {
  const nameInputs = [...document.querySelectorAll(`[name="player-nickname"]`)];
  const deleteButtons = [...document.querySelectorAll(`[name="card-numbers"]`)];
  const numberInputs = [...document.querySelectorAll(`[name="delete-loto-player"]`)];
  const startButton = document.getElementById("start-loto-btn");
  const restoreButton = document.getElementById("restore-loto-btn");
  const addGamePlayer = document.getElementById("add-loto-player-btn");
  if (enable) {
    nameInputs.forEach((input) => enableOrDisableElement(input, true));
    numberInputs.forEach((input) => enableOrDisableElement(input, true));
    deleteButtons.forEach((btn) => enableOrDisableElement(btn, true));
    enableOrDisableElement(startButton, true);
    enableOrDisableElement(restoreButton, true);
    enableOrDisableElement(addGamePlayer, true);
  } else {
    nameInputs.forEach((input) => enableOrDisableElement(input, false));
    numberInputs.forEach((input) => enableOrDisableElement(input, false));
    deleteButtons.forEach((btn) => enableOrDisableElement(btn, false));
    enableOrDisableElement(startButton, false);
    enableOrDisableElement(restoreButton, false);
    enableOrDisableElement(addGamePlayer, false);
  }
}
