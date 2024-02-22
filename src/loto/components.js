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
