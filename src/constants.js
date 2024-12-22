const validationErrorMessages = {
  NICKHANE: "Nickname should be unique and contain at least one character",
  LOTO_NUMBERS: (cardNumbersAmount, min, max) => `Should contain ${cardNumbersAmount} unique numbers from ${min} to ${max}`,
  LABYRINTH_MOVE_NUMBER: (min, max) => `Move must be in range ${min}-${max}`,
  BATTLESHIP_HORIZONTAL: "Should be А, Б, В, Г, Д or Е",
  BATTLESHIP_VERTICAL: "Should be 1, 2, 3, 4, 5 or 6",
  NOT_EMPTY: (fieldName) => `${fieldName} should not be empty`,
};
