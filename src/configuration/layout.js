function createConfigurationPageLayout() {
  return `
  <div id="configuration-header">
    <div id="title" class="mb-3">
      <h1 style="font-weight: bold;">Configuration</h1>
    </div>
  </div>
  <div id="configurationContainer" class="mt-5">
    <hr>
      ${BattleshipsConfigurationComponent(configurationPageOptions)}
    <hr>
      ${LotoConfigurationComponent(configurationPageOptions)}
    <hr>
  </div>
`;
}

function addEventListenersToConfigurationPage() {
  const boardSizeRadioButtons = [...document.querySelectorAll("#battleships-config-deck-size input")];

  //loto
  document.getElementById("edit-loto-config").addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableLotoConfigFields(true);
  });

  document.getElementById("config-loto-save").addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableLotoConfigFields(false);
    saveLotoConfig();
  });

  document.getElementById("config-loto-default").addEventListener("click", (event) => {
    event.preventDefault();
    setLotoConfig(initialConfig.loto);
  });

  document.getElementById("config-loto-cancel").addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableLotoConfigFields(false);
  });

  //battleships
  document.getElementById("edit-battleships-config").addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableBattleshipsConfigFields(true);
    enableOrDisableArrayOfElements(boardSizeRadioButtons, true);
  });

  document.getElementById("config-battleships-cancel").addEventListener("click", (event) => {
    event.preventDefault();
    enableOrDisableBattleshipsConfigFields(false);
    enableOrDisableArrayOfElements(boardSizeRadioButtons, false);
  });

  document.getElementById("config-battleships-save").addEventListener("click", (event) => {
    event.preventDefault();
    const isSaved = saveBattleShipsConfig();
    if (!isSaved) return;
    enableOrDisableBattleshipsConfigFields(false);
    enableOrDisableArrayOfElements(boardSizeRadioButtons, false);
  });

  document.getElementById("config-battleships-default").addEventListener("click", (event) => {
    event.preventDefault();
    setBattleshipsConfig(initialConfig.battleShips);
  });

  document.getElementById("battleships-config-deck-size").addEventListener("click", (event) => {
    event.preventDefault();
    // setCheckedAttributeToRadioButtonFromArray(boardSizeRadioButtons, event.target.id);
    //TODO: TBD
  });
}

function setStoredConfigToConfigurationPage() {
  const config = configurationService.getConfig();
  setLotoConfig(config.loto);
  setBattleshipsConfig(config.battleShips);
}

function setLotoConfig(lotoConfig) {
  Object.keys(lotoConfig).forEach((field) => {
    const element = document.getElementById(configurationPageOptions.loto.inputs[field].id);
    element.value = lotoConfig[field];
  });
}

function setBattleshipsConfig(generalConfig) {
  const selectedBoardSize = generalConfig.selectedBoardSize;
  const config = generalConfig.boards[selectedBoardSize];
  const inputsProps = configurationPageOptions.battleships.inputs;
  const inputs = Object.keys(inputsProps).reduce((res, key) => {
    res[key] = document.getElementById(inputsProps[key].id);
    return res;
  }, {});

  //general
  inputs["attempts"].value = config.maxShots;
  inputs["currency"].value = config.currency;
  inputs["hitPrize"].value = config.prizes.shoot;

  //amount
  inputs["single-deck"].value = getShipConfigBySize(config.ships, 1).amount;
  inputs["double-deck"].value = getShipConfigBySize(config.ships, 2).amount;
  inputs["three-deck"].value = getShipConfigBySize(config.ships, 3).amount;
  inputs["four-deck"].value = getShipConfigBySize(config.ships, 4).amount;

  //killing prize
  inputs["single-deck-kill-prize"].value = config.prizes.destroyBonus[1];
  inputs["double-deck-kill-prize"].value = config.prizes.destroyBonus[2];
  inputs["three-deck-kill-prize"].value = config.prizes.destroyBonus[3];
  inputs["four-deck-kill-prize"].value = config.prizes.destroyBonus[4];
}

function saveLotoConfig() {
  const newConfig = {
    min: getValueFromHTMLElement(configurationPageOptions.loto.inputs.min.id),
    max: getValueFromHTMLElement(configurationPageOptions.loto.inputs.max.id),
    cardNumbersAmount: getValueFromHTMLElement(configurationPageOptions.loto.inputs.cardNumbersAmount.id),
  };
  configurationService.setConfigForGame("loto", newConfig);
}

function saveBattleShipsConfig() {
  const newConfig = {
    selectedBoardSize: +getSelectedBoardSize(),
    boards: {
      6: {
        boardSize: +getSelectedBoardSize(),
        ships: [
          { size: 4, amount: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["four-deck"].id) },
          { size: 3, amount: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["three-deck"].id) },
          { size: 2, amount: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["double-deck"].id) },
          { size: 1, amount: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["single-deck"].id) },
        ],
        maxShots: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs.attempts.id),
        currency: getValueFromHTMLElement(configurationPageOptions.battleships.inputs.currency.id),
        prizes: {
          shoot: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs.hitPrize.id),
          destroyBonus: {
            4: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["four-deck-kill-prize"].id),
            3: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["three-deck-kill-prize"].id),
            2: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["double-deck-kill-prize"].id),
            1: +getValueFromHTMLElement(configurationPageOptions.battleships.inputs["single-deck-kill-prize"].id),
          },
        },
      },
    },
  };

  let isValidShipsConfig;
  for (let i = 0; i < 10; i++) {
    const game = new BattleShipsGame({ selectedBoardSize: newConfig.boards });
    const board = game.startGame();
    if (!board) {
      isValidShipsConfig = false;
      alert("Unable");
    }
  }

  if (isValidShipsConfig) configurationService.setConfigForGame("battleShips", newConfig);
  return isValidShipsConfig;
}

function saveConfiguration() {
  const storedConfig = configurationService.getConfig();
  const config = {
    loto: getLotoConfig(),
    // battleships: getBattleshipsConfig(),
    // labyrinth: getLabyrinthConfig(),
  };
  configurationService.setConfig({ ...storedConfig, ...config });
}

function getLotoConfig() {
  return {
    min: document.getElementById(configurationPageOptions.loto.inputs["min"].id).value,
    max: document.getElementById(configurationPageOptions.loto.inputs["max"].id).value,
    cardNumbersAmount: document.getElementById(configurationPageOptions.loto.inputs["cardNumbersAmount"].id).value,
  };
}

function enableOrDisableLotoConfigFields(enable) {
  enableOrdisableInputsFromProps(configurationPageOptions.loto.inputs, enable);
  enableOrDisableElement(document.getElementById(`config-loto-save`), enable);
  showOrHideElement(document.getElementById(`config-loto-cancel`), enable);
  enableOrDisableElement(document.getElementById(`config-loto-default`), enable);
}

function enableOrDisableBattleshipsConfigFields(enable) {
  enableOrdisableInputsFromProps(configurationPageOptions.battleships.inputs, enable);
  enableOrDisableElement(document.getElementById(`config-battleships-save`), enable);
  showOrHideElement(document.getElementById(`config-battleships-cancel`), enable);
  enableOrDisableElement(document.getElementById(`config-battleships-default`), enable);
}

function getSelectedBoardSize() {
  const boardSizeRadioButtons = [...document.querySelectorAll("#battleships-config-deck-size input")];
  return boardSizeRadioButtons.find((input) => input.getAttribute("checked") !== null).getAttribute("data-boardsize");
}
