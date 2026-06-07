function enableOrdisableInputsFromProps(inputsObjects, enable) {
  Object.values(inputsObjects).forEach((input) => {
    const field = document.getElementById(input.id);
    enableOrDisableElement(field, enable);
  });
}

function getShipConfigBySize(ships, size) {
  return ships.find((ship) => ship.size === size);
}

function setCheckedAttributeToRadioButtonFromArray(array, idOfCheckedElement) {
  array.forEach((el) => {
    el.getAttribute("id") === idOfCheckedElement ? el.setAttribute("checked", "") : el.removeAttribute("checked");
  });
}
