function createLabyrinthPageLayout() {
  return `
  <div class="container mt-4">
  <div class="d-flex justify-content-between mb-5">
    <h1>Labyrinth Game</h1>
    <button class="btn btn-primary">Restart game</button>
  </div>
  

  <div class="row">
      <div class="col-md-6">
          <form id="playersForm">
              <div class="mb-3" id="player-names">
                <h3>Enter Players' Names</h3>
                <div>
                  <input type="text" class="form-control" name="playerName" placeholder="Enter player name">                
                </div>
              </div>
              <button type="button" class="btn btn-primary" id="startBtn">Start</button>
              <div>
                <div class="mb-3 mt-4" id="player-moves">
                  <div>
                    <label for="playerMoves" class="form-label">Enter Player's Move (1-5)</label>
                    <input type="number" class="form-control" name="playerMove" min="1" max="5" disabled placeholder="Enter player's move">                
                  </div>
                </div>
                <button type="button" class="btn btn-success" id="moveBtn" disabled>Move</button>
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
  const playersMovesInputsArray = document.querySelectorAll(`[name="playerMove"]`);
  const playersNamesInputsArray = document.querySelectorAll(`[name="playerName"]`);
  const startButton = document.getElementById("startBtn");
  const moveButton = document.getElementById("moveBtn");
  const gameMap = document.getElementById("gameMap");
  const gameLog = document.getElementById("gameLog");

  startButton.addEventListener("click", function () {
    const nameInputs = [...playersNamesInputsArray];
    const moveInputs = [...playersMovesInputsArray];

    if (!validateInputsNotEmpty(nameInputs)) {
      return;
    }
    const names = nameInputs.map((input) => input.value);

    state.labyrinth.game = new Game(names);
    renderPlayersMovesInputs(names);
    moveInputs.forEach((i) => (i.value = 1));
    enableOrDisablePlayersNamesSection(false);
    enableOrDisablePlayersMovesSection(true);
    gameMap.value = state.labyrinth.game.map.getMapPrettified();
  });

  moveButton.addEventListener("click", (e) => {
    const moveInputs = [...document.querySelectorAll(`[name="playerMove"]`)];
    if (!validateMoveInputsValues(moveInputs)) {
      alert(1);
      return;
    }
    const moves = moveInputs.map((input) => {
      const player = state.labyrinth.game.players.find((p) => p.nickname === input.getAttribute("nickname"));
      console.log(state.labyrinth.game.players);
      console.log(input);
      return { player, dice: +input.value };
    });
    state.labyrinth.game.makeMoves(moves);
    gameLog.value += Logger.gameComments[Game.moveIndex].join("\n") + "\n";
  });

  function enableOrDisablePlayersNamesSection(enable) {
    const nameInputs = [...playersNamesInputsArray];
    if (enable) {
      nameInputs.forEach((input) => input.removeAttribute("disabled"));
      startButton.removeAttribute("disabled");
    } else {
      nameInputs.forEach((input) => input.setAttribute("disabled", ""));
      startButton.setAttribute("disabled", "");
    }
  }

  function enableOrDisablePlayersMovesSection(enable) {
    const moveInputs = [...playersMovesInputsArray];
    if (enable) {
      moveInputs.forEach((input) => input.removeAttribute("disabled"));
      moveButton.removeAttribute("disabled");
    } else {
      moveInputs.forEach((input) => input.setAttribute("disabled", ""));
      moveButton.setAttribute("disabled", "");
    }
  }
}

function validateInputsNotEmpty(inputs) {
  return inputs.every((el) => el.value.length);
}

function validateMoveInputsValues(moveInputs) {
  return moveInputs.every((el) => +el.value > 0 && +el.value < 6);
}

function renderPlayersMovesInputs(players) {
  const playersMovesSection = document.querySelector(`#player-moves`);
  playersMovesSection.innerHTML = generatePlayerMovesInputs(players);
}

function generatePlayerMovesInputs(players) {
  return players
    .map(
      (p) =>
        `<div>
      <label for="playerMoves" class="form-label">Ход ${p}</label>
      <input type="number" class="form-control" name="playerMove" nickname="${p}" min="1" max="5" placeholder="Введите ход цифрой 1-5">
    </div>
    `
    )
    .join("");
}
