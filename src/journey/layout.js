function createLabyrinthPageLayout() {
  return `
  <div class="container mt-4">
  <div class="d-flex justify-content-between mb-5">
    <h1>Labyrinth Game</h1>
    <div>
      <button type="button" class="btn btn-primary me-2" id="startBtn">Start</button>
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
  });

  playerNamesContainer.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.name === "delete-game-player") {
      if ([...document.querySelectorAll(".del-btn-modal")].length > 1) {
        const id = event.target.getAttribute("data-delete-id");
        const el = document.querySelector(`div[data-id="${id}"]`);
        el.parentNode.removeChild(el);
      }
    }
  });

  startButton.addEventListener("click", function (event) {
    event.preventDefault();
    if (state.labyrinth.game instanceof Game) {
      state.labyrinth.game = null;
    }
    const nameInputs = [...document.querySelectorAll(playersNamesInputsSelector)];

    if (!validateInputsNotEmpty(nameInputs)) {
      return;
    }
    enableOrDisablePlayersNamesSection(false);
    const names = nameInputs.map((input) => input.value);
    state.labyrinth.game = new Game(names);
    playerMovesSection.innerHTML = generatePlayerMovesSection(names);
    gameMap.value = state.labyrinth.game.map.getMapPrettified();
  });

  playerMovesSection.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.id === moveButtonId) {
      const moveInputs = [...document.querySelectorAll(playersMovesInputsSelector)];
      if (!validateMoveInputsValues(moveInputs) || state.labyrinth.game.isGameOver()) {
        gameLog.value += "==================== Игра закончена! ====================\n";
        gameLog.value += state.labyrinth.game.getGameResults();
        document.getElementById(moveButtonId).setAttribute("disabled", "");
        return;
      }

      if (!validateMoveInputsValues(moveInputs)) {
        return;
      }

      const moves = moveInputs.map((input) => {
        const player = state.labyrinth.game.players.find((p) => p.nickname === input.getAttribute("nickname"));

        return { player, dice: +input.value };
      });
      state.labyrinth.game.makeMoves(moves);
      gameLog.value += Game.logger.gameComments[Game.moveIndex].join("\n") + "\n";
    }
  });

  function enableOrDisablePlayersNamesSection(enable) {
    const nameInputs = [...document.querySelectorAll(playersNamesInputsSelector)];
    const deleteButtons = [...document.querySelectorAll(deletePlayersButtonSelector)];
    if (enable) {
      nameInputs.forEach((input) => input.removeAttribute("disabled"));
      deleteButtons.forEach((btn) => btn.removeAttribute("disabled"));
      startButton.removeAttribute("disabled");
    } else {
      nameInputs.forEach((input) => input.setAttribute("disabled", ""));
      deleteButtons.forEach((btn) => btn.setAttribute("disabled", ""));
      startButton.setAttribute("disabled", "");
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
    <button type="button" class="btn btn-success" id="moveBtn">Move</button>`;
  }

  function generatePlayerMoveInput(playerName) {
    return `
    <div class="col-md-11 mb-3">
    <label for="playerMoves" class="form-label">Ход ${playerName}</label>
    <input type="number" class="form-control" name="playerMove" nickname="${playerName}" min="1" max="5" placeholder="Введите ход цифрой 1-5">           
    </div>`;
  }
}

function validateInputsNotEmpty(inputs) {
  return inputs.every((el) => el.value.length);
}

function validateMoveInputsValues(moveInputs) {
  return moveInputs.every((el) => +el.value > 0 && +el.value < 6);
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
