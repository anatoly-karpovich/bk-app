function createLabyrinthPageLayout() {
  return `
  <div class="container mt-4">
  <div class="d-flex justify-content-between mb-5">
    <h1>Labyrinth Game</h1>
    <div>
      <button type="button" class="btn btn-primary me-2" id="startBtn" disabled>Start</button>
      <button class="btn btn-success" id="restart-game">Restart game</button>
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
                  </div>
              </div>
              <div class="mt-4" id="player-moves">
               
              </div>
          </form>
      </div>

      <div class="col-md-6">
          <h3>Game Map</h3>
          <textarea id="gameMap" class="form-control" rows="10" readonly>
          </textarea>
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
  const moveButtonId = "moveBtn";
  const gameMap = document.getElementById("gameMap");
  const gameLog = document.getElementById("gameLog");
  const playerNamesContainer = document.getElementById("players-container");
  const addGamePlayer = document.getElementById("add-game-player-btn");
  const restartGameButton = document.getElementById("restart-game");
  const playerMovesSection = document.getElementById("player-moves");

  restartGameButton.addEventListener("click", (event) => {
    event.preventDefault();
    state.labyrinth.game = {};
    enableOrDisablePlayersNamesSection(true);
    gameLog.value = "";
    gameMap.value = "";
    removePlayerMovesSection();
    playerNamesContainer.innerHTML = generateGamePlayerInput();
  });

  addGamePlayer.addEventListener("click", (event) => {
    event.preventDefault();
    playerNamesContainer.insertAdjacentHTML("beforeend", generateGamePlayerInput());
    enableOrDisableElement(startButton, false);
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
      validatePlayerInputsValues(plyerInputs) ? enableOrDisableElement(startButton, true) : enableOrDisableElement(startButton, false);
    }
  });

  playerNamesContainer.addEventListener("input", (event) => {
    event.preventDefault();
    const plyerInputs = [...document.querySelectorAll(`input[name="playerName"]`)];
    validatePlayerInputsValues(plyerInputs) ? enableOrDisableElement(startButton, true) : enableOrDisableElement(startButton, false);
  });

  startButton.addEventListener("click", function (event) {
    event.preventDefault();
    if (state.labyrinth?.game instanceof Game) {
      state.labyrinth.game = null;
    }
    const nameInputs = [...document.querySelectorAll(playersNamesInputsSelector)];

    if (!validateInputsNotEmpty(nameInputs)) {
      return;
    }
    const names = nameInputs.map((input) => input.value);
    state.labyrinth.game = new Game(names);
    playerMovesSection.innerHTML = generatePlayerMovesSection(names);
    gameMap.value = state.labyrinth.game.map.getMapPrettified();
    playerNamesContainer.innerHTML = generateGamePlayerInput();
    enableOrDisablePlayersNamesSection(false);
  });

  playerMovesSection.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.id === moveButtonId) {
      const moveInputs = [...document.querySelectorAll(`#player-moves-inputs input:not([disabled])`)];

      if (!validateMoveInputsValues(moveInputs)) {
        return;
      }

      const moves = moveInputs.map((input) => {
        const player = state.labyrinth.game.players.find((p) => p.nickname === input.getAttribute("nickname"));

        return { player, dice: +input.value };
      });
      state.labyrinth.game.makeMoves(moves);
      gameLog.value += Game.logger.gameComments[Game.moveIndex].join("\n") + "\n";
      moveInputs.forEach((moveInput) => (moveInput.value = ""));
      disableInputsForPlayersWhoFinished();
      const moveButton = document.getElementById(moveButtonId);
      enableOrDisableElement(moveButton, false);
      if (state.labyrinth.game.isGameOver()) {
        gameLog.value += "==================== Игра закончена! ====================\n";
        gameLog.value += state.labyrinth.game.getGameResults();
        return;
      }
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
    } else if (event.target.name === "delete-move-player") {
      const deleteButtonsAmount = document.querySelectorAll(`[name="delete-move-player"]`).length;
      if (!deleteButtonsAmount) {
        return;
      }
      const deleteButton = event.target;
      const id = deleteButton.getAttribute("data-delete-id");
      const nickName = id.replace("move-", "");
      const deleteApproved = confirm(`Delete ${nickName}?`);
      if (deleteApproved) {
        const playerMoveInput = document.querySelector(`[data-player-move-id="${id}"]`);
        playerMoveInput.parentNode.removeChild(playerMoveInput);
        state.labyrinth.game.removePlayer(nickName);
      }
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

  function removePlayerMovesSection() {
    playerMovesSection.innerHTML = "";
  }

  function generatePlayerMovesSection(playerNames = []) {
    return `
    <div id="player-moves-inputs" class="mb-3">
      ${playerNames.map((p) => generatePlayerMoveInput(p)).join("")}
    </div>
    <button type="button" class="btn btn-success" id="moveBtn" disabled>Move</button>`;
  }

  function generatePlayerMoveInput(playerName) {
    const id = "move-" + playerName;
    const inputOptions = { nickname: playerName, name: "playerMove", placeholder: "Введите ход цифрой 1-5", min: 1, max: 5, id };
    return `
    <div class="d-flex justify-content-between" data-player-move-id="${id}">  
      <div class="col-md-10 mb-3">
        <label for="${id}" class="form-label">Ход ${playerName}</label>
        ${generateNumberInput(inputOptions, "Move must be in range 1-5")}         
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
  return input.value && +input.value >= configuration.minNumberOfSteps && input.value <= configuration.maxNumberOfSteps;
}

function validateMoveInputsValues(moveInputs) {
  let isValid = true;
  moveInputs.forEach((el) => {
    if (validateMoveInputValue(el)) {
      makeInputInvalidOrValid(el, true);
    } else {
      makeInputInvalidOrValid(el, false);
      isValid = false;
    }
  });
  return isValid;
}

function validatePlayerInputsValues(playerInputs) {
  let isValid = true;
  playerInputs.forEach((el) => {
    if (el.value) {
      makeInputInvalidOrValid(el, true);
    } else {
      makeInputInvalidOrValid(el, false);
      isValid = false;
    }
  });
  const duplicates = getDuplicatesFromArrayOfInputs(playerInputs);
  if (duplicates.length) {
    isValid = false;
    duplicates.forEach((input) => {
      makeInputInvalidOrValid(input, false);
    });
  }
  return isValid;
}

function generateGamePlayerInput() {
  const id = window.crypto.randomUUID();
  return `
  <div class="mb-3 d-flex justify-content-between" data-id="${id}">
    <div class="col-md-11" name="game-player">${generateTextInput({ placeholder: "Enter players nickname", id: id, name: "playerName" })}</div>
    <div class="col-md-1 delete-in-modal">
      <button class="btn btn-link text-danger del-btn-modal" title="Remove Player" name="delete-game-player" data-delete-id="${id}">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  </div>
  `;
}

function disableInputsForPlayersWhoFinished() {
  const finished = state.labyrinth.game.getFinishedPlayers();
  if (!finished.length) {
    return;
  }
  finished.forEach((player) => {
    const input = document.querySelector(`[nickname="${player.nickname}"]`);
    const skipButton = document.querySelector(`[data-skip-id="move-${player.nickname}"]`);
    const deleteButton = document.querySelector(`[data-delete-id="move-${player.nickname}"]`);
    enableOrDisableElement(input, false);
    enableOrDisableElement(skipButton, false);
    enableOrDisableElement(deleteButton, false);
  });
}
