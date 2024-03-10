function EditPencilButton(id) {
  return `
  <button class="btn btn-light edit-pencil" id="${id}" title="Edit Products">
  <i class="bi bi-pencil-fill"></i>
  </button>`;
}

function RadioButton(options) {
  return `
  <div class="form-check mb-2">
    <input class="form-check-input" type="radio" id="${options.id}" 
    ${options.attributes && options.attributes.length ? options.attributes.reduce((a, b) => a + " " + b, "") : ""}>
    <label class="form-check-label" for="${options.id}">${options.label}</label>
  </div>
  `;
}

function LotoConfigurationComponent(configurationPageOptions) {
  return `
  <div id="loto-config" class="mb-5">
      <div class="mb-3 d-flex justify-content-start">
        <h2 class="fw-bold">Loto</h2>
        ${EditPencilButton("edit-loto-config")}
      </div>
      <form class="row g-3 form-with-inputs" id="loto-config-form">
       <div class="d-flex justify-content-start">
        ${generateFormTextInput(configurationPageOptions.loto.inputs.min)}
        ${generateFormTextInput(configurationPageOptions.loto.inputs.max)}
        ${generateFormTextInput(configurationPageOptions.loto.inputs.cardNumbersAmount)}
       </div>
       <div class="d-flex justify-content-start mt-4">
        <button class="btn btn-primary me-3" id="config-loto-save" disabled>Save</button>
        <button class="btn btn-outline-primary me-3 d-none" id="config-loto-cancel">Cancel</button>
        <button class="btn btn-outline-danger" id="config-loto-default" disabled>Set default</button>
       </div>
      </form>
    </div>
  `;
}

function BattleshipsConfigurationComponent(configurationPageOptions) {
  return `
  <div id="battleships-config" class="mb-5">
      <div class="mb-3 d-flex justify-content-start">
        <h2 class="fw-bold">Battleships</h2>
        ${EditPencilButton("edit-battleships-config")}
      </div>
      <form class="row g-3 form-with-inputs" id="battleships-config-form">
        <div>
          <div class="d-flex justify-content-start mt-2">
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["attempts"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["hitPrize"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs.currency)}
          </div>
          <h5 class="mt-5">Deck size</h5>
          <div class="d-flex justify-content-start mt-3" id="battleships-config-deck-size">
            <div class="me-5">
              ${RadioButton({ id: "battleships-config-deck-size-6", label: "6x6 game", attributes: ["disabled", "data-boardSize=6", "name=battleships-config-deck-size", "checked"] })}          
            </div>
            <div class="me-5">
              ${RadioButton({ id: "battleships-config-deck-size-7", label: "7x7 game", attributes: ["disabled", "data-boardSize=7", "name=battleships-config-deck-size"] })}          
            </div>
            <div class="me-5">
              ${RadioButton({ id: "battleships-config-deck-size-8", label: "8x8 game", attributes: ["disabled", "data-boardSize=8", "name=battleships-config-deck-size"] })}          
            </div>
          </div>
          <h5 class="mt-4">Prize for ship kill</h5>
          <div class="d-flex justify-content-start mt-3">
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["single-deck-kill-prize"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["double-deck-kill-prize"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["three-deck-kill-prize"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["four-deck-kill-prize"])}
          </div>
          <h5 class="mt-5">Amount of ships on deck</h5>
          <div class="d-flex justify-content-start mt-3">
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["single-deck"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["double-deck"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["three-deck"])}
            ${generateFormTextInput(configurationPageOptions.battleships.inputs["four-deck"])}
          </div>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary me-3" id="config-battleships-save" disabled>Save</button>
          <button class="btn btn-outline-primary me-3 d-none" id="config-battleships-cancel">Cancel</button>
          <button class="btn btn-outline-danger" id="config-battleships-default" disabled>Set default</button>
        </div>
      </form>
    </div>
  `;
}

function LabyrinthConfigurationComponent(configurationPageOptions) {
  return `
  <div id="labyrinth-config" class="mb-5">
      <div class="mb-3 d-flex justify-content-start">
        <h2 class="fw-bold">Labyrinth</h2>
        ${EditPencilButton("edit-labyrinth-config")}
      </div>
      <form class="row g-3 form-with-inputs" id="labyrinth-config-form">
       <div class="d-flex justify-content-start">
        ${generateFormTextInput(configurationPageOptions.labyrinth.inputs.min)}
        ${generateFormTextInput(configurationPageOptions.labyrinth.inputs.max)}
        ${generateFormTextInput(configurationPageOptions.labyrinth.inputs.cardNumbersAmount)}
       </div>
       <div>
        <button class="btn btn-outline-danger" id="config-labyrinth-default">Set default</button>
       </div>
      </form>
    </div>
  `;
}
