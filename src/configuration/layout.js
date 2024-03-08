function createConfigurationPageLayout() {
  return `
  <div id="configuration-header">
    <div id="title" class="mb-3">
      <h1 style="font-weight: bold;">Configuration</h1>
    </div>
  </div>
  <div id="configurationContainer" class="mt-5">
    <hr>
      ${LotoConfigurationComponent(configurationPageOptions)}
    <hr>
      ${BattleshipsConfigurationComponent(configurationPageOptions)}
    <hr>
  </div>
`;
}

function setStoredConfigToConfigurationPage() {
  const config = configurationService.getConfig();
  setLotoConfig(config.loto);
}

function setLotoConfig(lotoConfig) {
  Object.keys(lotoConfig).forEach((field) => {
    const element = document.getElementById(configurationPageOptions.loto.inputs[field].id);
    element.value = lotoConfig[field];
  });
}

function addEventListenersToConfigurationPage() {
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
}

function saveLotoConfig() {
  const newConfig = {
    min: getValueFromHTMLElement(configurationPageOptions.loto.inputs.min.id),
    max: getValueFromHTMLElement(configurationPageOptions.loto.inputs.max.id),
    cardNumbersAmount: getValueFromHTMLElement(configurationPageOptions.loto.inputs.cardNumbersAmount.id),
  };
  configurationService.setConfigForGame("loto", newConfig);
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
  Object.values(configurationPageOptions.loto.inputs).forEach((input) => {
    const field = document.getElementById(input.id);
    enableOrDisableElement(field, enable);
  });
  enableOrDisableElement(document.getElementById(`config-loto-save`), enable);
  enableOrDisableElement(document.getElementById(`config-loto-default`), enable);
}
