function createBattleshipPageLayout() {
  return `
  <div id="header">
    <div class="col-md-3 mb-3">
      <label for="battleship-player-name-input" class="form-label">Battleship player</label>
      ${generateTextInput({ placeholder: "Enter players nickname", id: "battleship-player-name-input" }, validationErrorMessages.NICKHANE)}
    </div>
    <div>
      <button id="start-battleship-game-button" class="btn btn-primary form-buttons" disabled>Start Game</button>
      <button id="restore-battleship-game-button" class="btn btn-success form-buttons">Restore Game</button>
      <button id="restart-battleship-game-button" class="btn btn-secondary form-buttons">Restart Game</button>
    </div>
  </div>
  <div id="container"></div>
`;
}

const numToAbcCoordinatesMapper = {
  1: "а",
  2: "б",
  3: "в",
  4: "г",
  5: "д",
  6: "е",
};

function addEventListenersToBattleshipPage() {
  const playerInput = document.getElementById(`battleship-player-name-input`);
  const startButton = document.getElementById(`start-battleship-game-button`);
  const restoreButton = document.getElementById(`restore-battleship-game-button`);
  const restartButton = document.getElementById(`restart-battleship-game-button`);
  const moveButtonId = `battleship-move`;
  const container = document.getElementById(`container`);
  const horizontalMoveInputId = "battleship-move-horizontal-input";
  const verticalMoveInputId = "battleship-move-vertical-input";

  restoreButton.addEventListener("click", (event) => {
    event.preventDefault();
    const storedGameData = battleShipsService.getGame();
    console.log(storedGameData.shipsCoordinates);
    startBattleshipGame(storedGameData.board, storedGameData.shipsCoordinates);
    for (const move of storedGameData.moves) {
      makeMove(move.horizontal, move.vertical);
    }
  });

  playerInput.addEventListener("input", (event) => {
    event.preventDefault();
    !!playerInput.value ? enableOrDisableElement(startButton, true) : enableOrDisableElement(startButton, false);
  });

  function disabOrEnableleHeaderSection(enable = true) {
    if (enable) {
      enableOrDisableElement(playerInput, true);
      enableOrDisableElement(startButton, true);
      enableOrDisableElement(restoreButton, true);
    } else {
      enableOrDisableElement(playerInput, false);
      enableOrDisableElement(startButton, false);
      enableOrDisableElement(restoreButton, false);
    }
  }

  startButton.addEventListener("click", (event) => {
    event.preventDefault();
    startBattleshipGame();
  });

  function startBattleshipGame(storedBoard, storedShipsCoordinates) {
    state.battleships = new BattleShipsGame();
    const board = state.battleships.startGame(
      configurationService.getConfigForGame("battleShips").ships,
      configurationService.getConfigForGame("battleShips").boardSize,
      storedBoard,
      storedShipsCoordinates
    );
    container.innerHTML = createGameSection(configurationService.getConfigForGame("battleShips").boardSize, board);
    const attemptsOutput = document.getElementById("battleship-attempts-output");
    const prizeOutput = document.getElementById("battleship-prize-output");
    prizeOutput.value = `0`;
    attemptsOutput.value = `${configurationService.getConfigForGame("battleShips").maxShots}`;
    disabOrEnableleHeaderSection(false);
  }

  restartButton.addEventListener("click", (event) => {
    event.preventDefault();
    container.innerHTML = "";
    disabOrEnableleHeaderSection(true);
  });

  container.addEventListener("click", (event) => {
    event.preventDefault();
    const horizontalInput = document.getElementById(horizontalMoveInputId);
    const verticalInput = document.getElementById(verticalMoveInputId);

    if (event.target.id === moveButtonId) {
      const horizontal = horizontalInput.value;
      const vertical = +verticalInput.value;

      makeMove(horizontal, vertical);
    } else if (event.target.id === "battleship-undo-move") {
      const lastMove = state.battleships.getLastMove();
      const prize = battleshipMoveHandler(lastMove, true);
      const prizeOutput = document.getElementById("battleship-prize-output");
      const attemptsOutput = document.getElementById("battleship-attempts-output");
      prizeOutput.value = prize;
      attemptsOutput.value = +attemptsOutput.value + 1;
      const undoButton = document.getElementById("battleship-undo-move");
      horizontalInput.value = "";
      verticalInput.value = "";
      if (+attemptsOutput.value === configurationService.getConfigForGame("battleShips").maxShots) {
        enableOrDisableElement(undoButton, false);
      }
    }
  });

  function makeMove(horizontal, vertical) {
    const prize = battleshipMoveHandler({ horizontal, vertical });
    const prizeOutput = document.getElementById("battleship-prize-output");
    const attemptsOutput = document.getElementById("battleship-attempts-output");
    prizeOutput.value = prize;
    attemptsOutput.value = +attemptsOutput.value - 1;
    const horizontalInput = document.getElementById(horizontalMoveInputId);
    const verticalInput = document.getElementById(verticalMoveInputId);
    horizontalInput.value = "";
    verticalInput.value = "";
    const moveButton = document.getElementById(moveButtonId);
    const undoButton = document.getElementById("battleship-undo-move");
    enableOrDisableElement(undoButton, true);
    enableOrDisableElement(moveButton, false);
    if (state.battleships.isGameOver() || +attemptsOutput.value <= 0) {
      // enableOrDisableElement(event.target, false);
      enableOrDisableElement(horizontalInput, false);
      enableOrDisableElement(verticalInput, false);
    }
  }

  function validateBattleshipMoveInputs() {
    const horizontalInput = document.getElementById(horizontalMoveInputId);
    const isValidHorizontal = validateHorizontalCoordinate(horizontalInput.value);
    const verticalInput = document.getElementById(verticalMoveInputId);
    const isValidVertical = validateVerticalCoordinate(verticalInput.value);

    isValidHorizontal ? makeInputInvalidOrValid(horizontalInput, true) : makeInputInvalidOrValid(horizontalInput, false);
    isValidVertical ? makeInputInvalidOrValid(verticalInput, true) : makeInputInvalidOrValid(verticalInput, false);

    return isValidHorizontal && isValidVertical;
  }

  container.addEventListener("input", (event) => {
    event.preventDefault();

    const horizontalInput = document.getElementById(horizontalMoveInputId);
    const verticalInput = document.getElementById(verticalMoveInputId);

    const isDuplicated = isDuplicatedMove(horizontalInput.value, verticalInput.value);
    const isValid = validateBattleshipMoveInputs(horizontalInput.value, verticalInput.value);
    const moveButton = document.getElementById(moveButtonId);
    isValid && !isDuplicated ? enableOrDisableElement(moveButton, true) : enableOrDisableElement(moveButton, false);
  });
}

function isDuplicatedMove(horizontal, vertical) {
  const moves = state.battleships.getMoves();
  console.log(getKeyByValueFromObject(numToAbcCoordinatesMapper, horizontal));
  const isDuplicated = moves.some((el) => el.horizontal === getKeyByValueFromObject(numToAbcCoordinatesMapper, horizontal) && el.vertical === +vertical);
  return isDuplicated;
}

function battleshipMoveHandler({ horizontal, vertical }, undo = false) {
  if (undo) {
    state.battleships.undoMove();
    const cell = findCellByCoordinates({ horizontal, vertical });
    // const ship = state.battleships.findShipByCoordinates({ horizontal, vertical });
    const ship = state.battleships.getShips().find((ship) => ship.some((s) => s.horizontal === horizontal && s.vertical === vertical));
    cell.setAttribute("isHit", "false");
    if (ship) {
      const shipSize = ship.length;
      cell.innerHTML = `<i class="bi bi${shipSize ? "-" + shipSize : ""}-square"></i>`;
      cell.classList.add("text-primary");
      cell.classList.remove("text-danger");
    } else {
      cell.innerHTML = `<i class="bi bi-square"></i>`;
    }
  } else {
    const horizontalNum = typeof horizontal === "number" ? horizontal : getKeyByValueFromObject(numToAbcCoordinatesMapper, horizontal.toLowerCase());
    const result = state.battleships.makeMove({ horizontal: horizontalNum, vertical });
    const cell = findCellByCoordinates({ horizontal: horizontalNum, vertical });
    cell.setAttribute("isHit", "true");
    if (result) {
      cell.innerHTML = `<i class="bi bi-x-square"></i>`;
      cell.classList.add("text-danger");
      cell.classList.remove("text-primary");
    } else {
      cell.innerHTML = `<i class="bi bi-dice-1"></i>`;
    }
  }

  currentPrize = state.battleships.getCurrentPrize();
  return currentPrize;
}

function findCellByCoordinates({ horizontal, vertical }) {
  const cell = document.querySelector(`div[row="${horizontal}"][cell="${vertical}"]`);
  return cell;
}

function createHohizontalMarking(boardSize = configurationService.getConfigForGame("battleShips").boardSize) {
  let marking = "";
  for (let i = 1; i <= boardSize; i++) {
    marking += createMarkingElement(i);
  }
  return `
  <div class="d-flex justify-content-center" style="width: 335px" marking="horizontal">
    <div class="cell text-success"><i class="bi bi-tsunami"></i></div>
    ${marking}
  </div>  
  `;
}

function createMarkingElement(num) {
  return `<div class="cell text-primary"><span>${num}</span></i></div>`;
}

function createAbcMarkingElement(num) {
  return `<div class="cell text-primary" style="margin-top: 4px;"><span>${numToAbcCoordinatesMapper[num].toUpperCase()}</span></div>`;
}

function createBattleShipRow(rowNumber = 1, boardSize = configurationService.getConfigForGame("battleShips").boardSize, board) {
  let row = "";
  const boardRow = board[rowNumber - 1];
  for (let i = 0; i < boardSize; i++) {
    row += createBattleShipRowElement(rowNumber, i + 1, boardRow[i]);
  }
  //    ${createMarkingElement(rowNumber)}
  return `
  <div class="d-flex justify-content-center" style="width: 335px"  row="${rowNumber}">
    ${createAbcMarkingElement(rowNumber)}
    ${row}
  </div>  
  `;
}

function createBattleShipRowElement(rowNumber = 1, cellNumber = 1, shipSize) {
  return `<div class="cell text-success" isHit="false" row="${rowNumber}" cell="${cellNumber}"><i class="bi bi${shipSize ? "-" + shipSize : ""}-square"></i></div>`;
}

function createBattleShipBoard(boardSize = configurationService.getConfigForGame("battleShips").boardSize, board) {
  let row = `${createHohizontalMarking(boardSize)}`;
  for (let i = 1; i <= boardSize; i++) {
    row += createBattleShipRow(i, boardSize, board);
  }
  return row;
}

function validateHorizontalCoordinate(horizontal) {
  return Object.values(numToAbcCoordinatesMapper).includes(horizontal.toLowerCase());
}

function validateVerticalCoordinate(vertical) {
  return !isNaN(vertical) && +vertical > 0 && +vertical <= configurationService.getConfigForGame("battleShips").boardSize;
}

function createGameSection(boardSize, board) {
  return `
  <div id="battleship-move-section">

  <div>
      <div class="mt-5 col-md-3 d-flex justify-content-between">
        <div class="me-3">
          <label for="battleship-move-horizontal-input" class="form-label">Horizontal coordinate</label>
          ${generateTextInput({ placeholder: "Enter horizontal number", id: "battleship-move-horizontal-input" }, validationErrorMessages.BATTLESHIP_HORIZONTAL)}
        </div>
        <div>
          <label for="battleship-move-vertical-input" class="form-label">Vertical coordinate</label>
          ${generateNumberInput({ placeholder: "Enter vertical number", id: "battleship-move-vertical-input" }, validationErrorMessages.BATTLESHIP_VERTICAL)}
        </div>
      </div>
      <div class="mt-3 d-flex justify-content-between col-md-3">
        <button id="battleship-move" class="btn btn-primary form-buttons" disabled>Shoot!</button>
        <button id="battleship-undo-move" class="btn btn-primary" disabled>Undo shoot</button>
      </div>
      <div class="col-md-3 d-flex justify-content-between mt-3">
        <div class="me-3">
          <label for="battleship-prize-output" class="form-label">Prize (${configurationService.getConfigForGame("battleShips").currency})</label>
          ${generateTextInput({ id: "battleship-prize-output", disabled: true })}
        </div>
        <div>
          <label for="battleship-attempts-output" class="form-label">Attempts left</label>
          ${generateTextInput({ id: "battleship-attempts-output", disabled: true })}
        </div>
      </div>
    </div>
    <div class="mt-5 col-md-5 ms-3" id="board-container"> 
      ${createBattleShipBoard(boardSize, board)}
    </div>
  </div>
   
  `;
}
