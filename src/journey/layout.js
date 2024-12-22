function createLabyrinthPageLayout() {
  return `
  <div class="container mt-4">
  <div class="d-flex justify-content-between mb-5">
    <h1>Labyrinth Game</h1>
    <div>
      <button type="button" class="btn btn-primary me-2" id="startBtn" disabled>Start game</button>
      <button type="button" class="btn btn-success me-2" id="restoreBtn" disabled>Restore game</button>
      <button class="btn btn-secondary" id="restart-game">Restart</button>
    </div>
  </div>

  <div class="row">
      <div class="col-md-6">
          <form id="playersForm">
              <div class="mb-3" id="player-names">
                <h3>Enter Players' Names</h3>
                  <div id="players-container">
                    ${generateGamePlayerInput()}
                  </div>
                  <div>
                    <button id="add-game-player-btn" class="btn btn-outline-primary form-buttons">Add Player</button>
                    <button id="add-game-players-list-btn" class="btn btn-outline-secondary me-3">Add Players List</button>
                  </div>
                  <div class="mt-3 col-md-11 d-none" id="players-list-section">
                    <textarea id="players-list-area" class="form-control" rows="10"></textarea>
                    <button class="btn btn-primary mt-3" id="apply-game-players-list-btn">Add</button>
                  </div>
              </div>
              <div class="mt-4" id="player-moves">
               
              </div>
          </form>
      </div>

      <div class="col-md-6">
        <div id="game-map-container">
          <h3>Game Map</h3>
          <textarea id="gameMap" class="form-control" rows="10" readonly>
          </textarea>
        </div>
        <div id="game-state-container" class="d-none mt-4">
          <h3>Game State</h3>
          <textarea id="gameState" class="form-control" rows="10" readonly>
          </textarea>
          </div>
      </div>
  </div>

  <div class="mt-4">
      <h3>Game Log</h3>
      <textarea id="gameLog" class="form-control" rows="15" readonly></textarea>
  </div>
</div>
`;
}

function addEventListenersToLabyrinthPage() {
  const playersMovesInputsSelector = `[name="playerMove"]`;
  const playersNamesInputsSelector = `[name="playerName"]`;
  const deletePlayersButtonSelector = `[name="delete-game-player"]`;
  const startButton = document.getElementById("startBtn");
  const restoreButton = document.getElementById("restoreBtn");
  const moveButtonId = "moveBtn";
  const gameMap = document.getElementById("gameMap");
  const gameLog = document.getElementById("gameLog");
  const playerNamesContainer = document.getElementById("players-container");
  const addGamePlayer = document.getElementById("add-game-player-btn");
  const addGamePlayersListBtn = document.getElementById("add-game-players-list-btn");
  const applyGamePlayersList = document.getElementById("apply-game-players-list-btn");
  const playersListSection = document.getElementById("players-list-section");
  const playerListArea = document.getElementById("players-list-area");
  const restartGameButton = document.getElementById("restart-game");
  const playerMovesSection = document.getElementById("player-moves");
  const gameState = document.getElementById("gameState");

  const g = new Game();
  const storedLog = g.getGameLog();
  if (storedLog.players.length) {
    enableOrDisableElement(restoreButton, true);
  }

  restartGameButton.addEventListener("click", (event) => {
    event.preventDefault();
    state.labyrinth.game = {};
    enableOrDisablePlayersNamesSection(true);
    gameLog.value = "";
    gameMap.value = "";
    removePlayerMovesSection();
    playerNamesContainer.innerHTML = generateGamePlayerInput();
    displayOrHideGameLog(false);
  });

  addGamePlayer.addEventListener("click", (event) => {
    event.preventDefault();
    playerNamesContainer.insertAdjacentHTML("beforeend", generateGamePlayerInput());
    enableOrDisableElement(startButton, false);
  });

  addGamePlayersListBtn.addEventListener("click", (event) => {
    event.preventDefault();
    playersListSection.classList.contains("d-none")
      ? playersListSection.classList.remove("d-none")
      : playersListSection.classList.add("d-none");
  });

  applyGamePlayersList.addEventListener("click", (event) => {
    event.preventDefault();
    const dj = document.querySelector("strong#dj-name").textContent;
    const text = playerListArea.value;

    if (!text) return;

    const names = getNickNamesFromChatMessages(text, dj);
    for (const name of names) {
      const inputExists = [...document.querySelectorAll(`[name="playerName"]`)].some(
        (i) => i.value.trim() === name.trim()
      );
      if (!inputExists) {
        const id = window.crypto.randomUUID();
        playerNamesContainer.insertAdjacentHTML("beforeend", generateGamePlayerInput(id));
        const input = document.getElementById(id);
        input.value = name.trim();
      }
    }

    playersListSection.classList.add("d-none");
    const playerInputs = [...document.querySelectorAll(`input[name="playerName"]`)];
    const emptyPlayerNameInputs = playerInputs.filter((input) => !input.value.trim());
    if ([...document.querySelectorAll(".del-btn-modal")].length > 1 && emptyPlayerNameInputs.length) {
      for (const input of emptyPlayerNameInputs) {
        const id = input.getAttribute("id");
        const el = document.querySelector(`div[data-id="${id}"]`);
        el.parentNode.removeChild(el);
      }
    }
    validatePlayerInputsValues(playerInputs)
      ? enableOrDisableElement(startButton, true)
      : enableOrDisableElement(startButton, false);
  });

  playerNamesContainer.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.name === "delete-game-player") {
      if ([...document.querySelectorAll(".del-btn-modal")].length > 1) {
        const id = event.target.getAttribute("data-delete-id");
        const el = document.querySelector(`div[data-id="${id}"]`);
        el.parentNode.removeChild(el);
      }
      const plyerInputs = [...document.querySelectorAll(`input[name="playerName"]`)];
      validatePlayerInputsValues(plyerInputs)
        ? enableOrDisableElement(startButton, true)
        : enableOrDisableElement(startButton, false);
    }
  });

  playerNamesContainer.addEventListener("input", (event) => {
    event.preventDefault();
    const plyerInputs = [...document.querySelectorAll(`input[name="playerName"]`)];
    validatePlayerInputsValues(plyerInputs)
      ? enableOrDisableElement(startButton, true)
      : enableOrDisableElement(startButton, false);
  });

  startButton.addEventListener("click", function (event) {
    event.preventDefault();
    startGame();
  });

  function startGame() {
    const nameInputs = [...document.querySelectorAll(playersNamesInputsSelector)];

    if (!validateInputsNotEmpty(nameInputs)) {
      return;
    }
    const names = nameInputs.map((input) => input.value.trim());
    state.labyrinth.game = new Game();
    state.labyrinth.game.startGame(names);
    playerMovesSection.innerHTML = generatePlayerMovesSection(names);
    gameMap.value = state.labyrinth.game.map.getMapPrettified();
    gameState.value = "";
    playerNamesContainer.innerHTML = generateGamePlayerInput();
    enableOrDisablePlayersNamesSection(false);
    displayOrHideGameLog(true);
    enableOrDisableElement(restoreButton, false);
  }

  restoreButton.addEventListener("click", (event) => {
    event.preventDefault();
    const game = new Game();
    state.labyrinth.game = game;
    const storedGame = game.restoreGame();
    playerMovesSection.innerHTML = generatePlayerMovesSection(storedGame.players);
    gameMap.value = state.labyrinth.game.map.getMapPrettified();
    playerNamesContainer.innerHTML = generateGamePlayerInput();
    enableOrDisablePlayersNamesSection(false);
    displayOrHideGameLog(true);
    enableOrDisableElement(restoreButton, false);

    gameLog.value += Game.logger.getStoredGameComments().flat().join("\n") + "\n";
    gameState.value = getGameState(state.labyrinth.game);
  });

  function makeMove(storedMoves) {
    const disabledMoveInputs = [...document.querySelectorAll(`#player-moves-inputs input[disabled]`)];
    const moveInputs = [...document.querySelectorAll(`#player-moves-inputs input:not([disabled])`)];

    let moves = {};
    if (storedMoves) {
      moves = storedMoves;
    } else {
      if (!validateMoveInputsValues(moveInputs)) {
        return;
      }

      moves = moveInputs.map((input) => {
        const player = state.labyrinth.game.players.find((p) => p.nickname === input.getAttribute("nickname"));

        return { player, dice: +input.value };
      });
    }
    state.labyrinth.game.makeMoves(moves);
    gameLog.value += Game.logger.gameComments[Game.moveIndex].join("\n") + "\n";
    if (disabledMoveInputs.length) {
      disabledMoveInputs.forEach((input) => {
        const nickname = input.getAttribute("nickname");
        gameLog.value += `${nickname} пропустил(-а) свой ход\n`;
      });
    }
    gameState.value = getGameState(state.labyrinth.game);
    moveInputs.forEach((moveInput) => (moveInput.value = ""));
    removeInputsForPlayersWhoFinished();
    const moveButton = document.getElementById(moveButtonId);
    const addMovesList = document.getElementById(`move-parse`);
    enableOrDisableElement(moveButton, false);
    if (state.labyrinth.game.isGameOver()) {
      displayResultsAfterGameOver();
      enableOrDisableElement(addMovesList, false);
      return;
    }
  }

  playerMovesSection.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.id === moveButtonId) {
      makeMove();
    } else if (event.target.name === "skip-move-player") {
      const skipButton = event.target;
      const i = skipButton.querySelector("i.bi");
      const isSkipped = i.classList.contains("bi-lock");
      const id = skipButton.getAttribute("data-skip-id");
      const playerMoveInput = document.getElementById(id);
      if (isSkipped) {
        i.classList.remove("bi-lock");
        i.classList.add("bi-unlock");
        enableOrDisableElement(playerMoveInput, false);
      } else {
        i.classList.add("bi-lock");
        i.classList.remove("bi-unlock");
        enableOrDisableElement(playerMoveInput, true);
      }
      const moveInputs = [...document.querySelectorAll(`#player-moves-inputs input`)];
      const moveButton = document.getElementById(moveButtonId);
      const moveInputsNotDisabled = [...document.querySelectorAll(`#player-moves-inputs input:not([disabled])`)];
      validateMoveInputsValues(moveInputs)
        ? enableOrDisableElement(moveButton, true)
        : enableOrDisableElement(moveButton, false);
      if (!moveInputsNotDisabled.length) {
        enableOrDisableElement(moveButton, false);
      }
    } else if (event.target.name === "delete-move-player") {
      removeMoveInputByClickingDelete(event.target);
      if (state.labyrinth.game.isGameOver()) {
        displayResultsAfterGameOver();
        return;
      }
    } else if (event.target.id === "move-parse") {
      event.preventDefault();
      const movesListSection = document.getElementById("moves-list-section");
      movesListSection.classList.contains("d-none")
        ? movesListSection.classList.remove("d-none")
        : movesListSection.classList.add("d-none");
    } else if (event.target.id === "apply-players-moves-list-btn") {
      const text = document.getElementById("moves-list-area").value;
      if (!text) return;
      const movesObject = getMovesFromText(text);
      for (const nickname of Object.keys(movesObject)) {
        try {
          const input = document.querySelector(`input[nickname="${nickname}"]`);
          input.value = movesObject[nickname];
        } catch (e) {
          console.log(e.message);
        }
      }
      const moveInputs = [...document.querySelectorAll(`#player-moves-inputs input`)];
      validateMoveInputsValues(moveInputs);
      const moveButton = document.getElementById(moveButtonId);
      if (!validateMoveInputsValues(moveInputs)) {
        enableOrDisableElement(moveButton, false);
      } else {
        enableOrDisableElement(moveButton, true);
      }
      const movesListSection = document.getElementById("moves-list-section");
      movesListSection.classList.add("d-none");
    }
  });

  playerMovesSection.addEventListener("input", () => {
    const moveInputs = [...document.querySelectorAll(`#player-moves-inputs input:not([disabled])`)];
    const moveButton = document.getElementById(moveButtonId);
    if (!validateMoveInputsValues(moveInputs)) {
      enableOrDisableElement(moveButton, false);
    } else {
      enableOrDisableElement(moveButton, true);
    }
  });

  function enableOrDisablePlayersNamesSection(enable) {
    const nameInputs = [...document.querySelectorAll(playersNamesInputsSelector)];
    const deleteButtons = [...document.querySelectorAll(deletePlayersButtonSelector)];
    if (enable) {
      nameInputs.forEach((input) => enableOrDisableElement(input, true));
      deleteButtons.forEach((btn) => enableOrDisableElement(btn, true));
      enableOrDisableElement(startButton, true);
      enableOrDisableElement(addGamePlayer, true);
    } else {
      nameInputs.forEach((input) => enableOrDisableElement(input, false));
      deleteButtons.forEach((btn) => enableOrDisableElement(btn, false));
      enableOrDisableElement(startButton, false);
      enableOrDisableElement(addGamePlayer, false);
    }
  }

  function displayResultsAfterGameOver() {
    gameLog.value += "==================== Игра закончена! ====================\n";
    gameLog.value += state.labyrinth.game.getGameResults();
    return;
  }

  function removePlayerMovesSection() {
    playerMovesSection.innerHTML = "";
  }

  function generatePlayerMovesSection(playerNames = []) {
    return `
    <div id="player-moves-inputs" class="mb-3">
      ${playerNames.map((p) => generatePlayerMoveInput(p)).join("")}
    </div>
    <div>
      <button type="button" class="btn btn-success" id="moveBtn" disabled>Move</button>
      <button type="button" class="btn btn-secondary ms-3" id="move-parse">Add moves list</button>
    </div>
    <div class="mt-3 col-md-11 d-none" id="moves-list-section">
      <textarea id="moves-list-area" class="form-control" rows="10"></textarea>
      <button class="btn btn-primary mt-3" id="apply-players-moves-list-btn">Parse</button>
    </div>`;
  }

  function generatePlayerMoveInput(playerName) {
    const id = "move-" + playerName;
    const config = configurationService.getConfig().labyrinth;
    const minMove = config.minNumberOfSteps;
    const maxMove = config.maxNumberOfSteps;
    const inputOptions = {
      nickname: playerName,
      name: "playerMove",
      placeholder: `Введите ход цифрой ${minMove}-${maxMove}`,
      min: minMove,
      max: maxMove,
      id,
    };
    return `
    <div class="d-flex justify-content-between" data-player-move-id="${id}">  
      <div class="col-md-10 mb-3">
        <label for="${id}" class="form-label">Ход ${playerName}</label>
        ${generateNumberInput(inputOptions, validationErrorMessages.LABYRINTH_MOVE_NUMBER(minMove, maxMove))}         
      </div>
      <div class="col-md-1 action-icon mt-2">
        <button class="btn btn-link text-primary del-btn-modal" title="Skip players move" name="skip-move-player" data-skip-id="${id}">
          <i class="bi bi-lock"></i>
        </button>
      </div>
      <div class="col-md-1 action-icon mt-2">
        <button class="btn btn-link text-danger del-btn-modal" title="Remove player from game" name="delete-move-player" data-delete-id="${id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
      `;
  }
}

function validateInputsNotEmpty(inputs) {
  return inputs.every((el) => el.value.length);
}

function validateMoveInputValue(input) {
  return (
    input.value &&
    +input.value >= configurationService.getConfig().labyrinth.minNumberOfSteps &&
    input.value <= configurationService.getConfig().labyrinth.maxNumberOfSteps &&
    Number.isInteger(+input.value)
  );
}

function validateMoveInputsValues(moveInputs) {
  let isValid = true;
  moveInputs.forEach((el) => {
    if (validateMoveInputValue(el) || el.getAttribute("disabled") !== null) {
      makeInputInvalidOrValid(el, true);
    } else {
      makeInputInvalidOrValid(el, false);
      isValid = false;
    }
  });
  return isValid;
}

function generateGamePlayerInput(providedId) {
  const id = providedId || window.crypto.randomUUID();
  return `
  <div class="mb-3 d-flex justify-content-between" data-id="${id}">
    <div class="col-md-11" name="game-player">${generateTextInput(
      { placeholder: "Enter players nickname", id: id, name: "playerName" },
      validationErrorMessages.NICKHANE
    )}</div>
    <div class="col-md-1 delete-in-modal">
      <button class="btn btn-link text-danger del-btn-modal" title="Remove Player" name="delete-game-player" data-delete-id="${id}">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  </div>
  `;
}

function removeInputsForPlayersWhoFinished() {
  const finished = state.labyrinth.game.getFinishedPlayers();
  if (!finished.length) {
    return;
  }
  finished.forEach((player) => {
    removeMoveInput(player.nickname);
  });
}

function removeMoveInputByClickingDelete(deleteButton) {
  const deleteButtonsAmount = document.querySelectorAll(`[name="delete-move-player"]`).length;
  const id = deleteButton.getAttribute("data-delete-id");
  const nickName = id.replace("move-", "");
  const deleteApproved = confirm(
    deleteButtonsAmount < 2 ? `Are you sure you want to delete the last player ${nickName}?` : `Delete ${nickName}?`
  );
  if (deleteApproved) {
    removeMoveInput(nickName);
    state.labyrinth.game.removePlayer(nickName);
  }
}

function removeMoveInput(nickname) {
  const playerMoveInput = document.querySelector(`[data-player-move-id="move-${nickname}"]`);
  if (playerMoveInput) {
    playerMoveInput.parentNode.removeChild(playerMoveInput);
  }
}

function getGameState(game) {
  return game.players
    .map(
      (p) =>
        `${p.nickname}: Награда: [${p.getFullPrize()} ${
          configurationService.getConfig().labyrinth.currency
        }], Клетка: [${p.getCurrentPosition()}]${p.hasJackpot() ? ", Нашел(-ла) сокровище" : ""}`
    )
    .join("\n");
}

function displayOrHideGameLog(display) {
  if (display) {
    document.getElementById("game-state-container").classList.add("d-block");
    document.getElementById("game-state-container").classList.remove("d-none");
  } else {
    document.getElementById("game-state-container").classList.add("d-none");
    document.getElementById("game-state-container").classList.remove("d-block");
  }
}

function getMovesFromText(inputText) {
  const rows = inputText.split(/\n/);
  return rows
    .filter((row) => row.trim() !== "" && !row.trim().includes("Ответить") && !row.includes("Страницы:")) //
    .map((row, index) => {
      const result = index % 2 ? parseInt(row.match(/\d+/)[0], 10) : row.split(" [")[0];
      return result;
    })
    .reduce((acc, row, index, arr) => {
      if (index % 2) {
        acc[arr[index - 1]] = row;
      }
      return acc;
    }, {});
}
