function generateNumberInRange(min = 1, max = 50) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getUniqueRandomNumber = (min, max, numbersToExcept = []) => {
  const generatedNumbers = [...numbersToExcept];
  return () => {
    if (generatedNumbers.length >= max) {
      return "All numbers generated";
    }
    let number = generateNumberInRange(min, max);
    while (generatedNumbers.includes(number)) {
      number = generateNumberInRange(min, max);
    }
    generatedNumbers.push(number);
    return number;
  };
};

function getRandomValueFromArray(array) {
  const arrayLength = array.length;
  return array[generateNumberInRange(0, arrayLength - 1)];
}

function generateLotoCardsForPlayers(cardNumbers) {
  return Object.keys(cardNumbers)
    .map((key) => generateLotoCard({ [key]: cardNumbers[key] }))
    .join("");
}

function generateLotoCard(card) {
  const playerName = Object.keys(card)[0];
  const playerCardNumbers = card[playerName];
  const id = window.crypto.randomUUID();
  return `
  <div data-id=${id} name="loto-table">
    <table class="table table-bordered" id="${playerName}">
      <thead>
          ${generateLotoCardHeader(playerName, id)}
      </thead>
      <tbody>
        ${generateLotoCardBody(playerCardNumbers)}
      </tbody>
    </table>
  </div>
  `;
}

function generateLotoCardHeader(name, id = "") {
  let headersString = `<tr><th colspan=15 data-header-id="${id}">${name}</th></tr>`;

  return headersString;
}

function generateLotoCardBody(lotoCardNumbers) {
  return ` <tr>` + lotoCardNumbers.map((num) => ` <td>${num}</td>`).join("") + `</tr>`;
}

function generateLotoCardNumbers(numberOfDigits = 10) {
  const result = [];
  while (result.length < numberOfDigits) {
    let nextNum = generateNumberInRange();
    while (result.includes(nextNum)) {
      nextNum = generateNumberInRange();
    }
    result.push(nextNum);
  }
  return result;
}

function generateTextInput(options, validationText = "") {
  let result = `<input type="text" class="form-control"  
  ${Object.keys(options)
    .map((key) => `${key}="${options[key]}"`)
    .join(" ")}
    >`;
  if (options.id && validationText) {
    result += `<div class="invalid-feedback" id="error-${options.id}">${validationText}</div>`;
  }
  return result;
}

function generateNumberInput(options, validationText = "") {
  let result = `<input type="number" class="form-control"  
  ${Object.keys(options)
    .map((key) => `${key}="${options[key]}"`)
    .join(" ")}
    >`;
  if (options.id) {
    result += `<div class="invalid-feedback" id="error-${options.id}">${validationText || ""}</div>`;
  }
  return result;
}

function makeInputInvalidOrValid(input, valid = true) {
  valid ? input.classList.remove("is-invalid") : input.classList.add("is-invalid");
}

function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  console.log("Data copied to clipboard: " + text);
}

function enableOrDisableElement(element, enable = true) {
  enable ? element.removeAttribute("disabled") : element.setAttribute("disabled", "");
}

function calculateReceipts(obj) {
  const result = {
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  };

  Object.values(obj).forEach((value) => {
    while (value - 100 >= 0) {
      result[100]++;
      value = value - 100;
    }
    while (value - 50 >= 0) {
      result[50]++;
      value = value - 50;
    }
    while (value - 20 >= 0) {
      result[20]++;
      value = value - 20;
    }
    while (value - 10 >= 0) {
      result[10]++;
      value = value - 10;
    }
    while (value - 5 >= 0) {
      result[5]++;
      value = value - 5;
    }
    while (value - 1 >= 0) {
      result[1]++;
      value = value - 1;
    }
  });
  return result;
}

function generateReceiptsReport(obj) {
  return Object.keys(obj).reduce((a, b) => {
    a += `Чеки по ${b} екр: ${obj[b]} штук\n`;
    return a;
  }, "");
}

function getDuplicatesFromArray(array = []) {
  const duplicates = _.filter(array, (value, index, iteratee) => _.includes(iteratee, value, index + 1));
  return duplicates;
}

function getDuplicatesIndexes(array = []) {
  const duplicatesIndexes = [];
  array.forEach((value, index) => {
    if (array.filter((v) => v === value).length > 1) {
      duplicatesIndexes.push(index);
    }
  });
  return duplicatesIndexes;
}

function getDuplicatesFromArrayOfInputs(inputs = []) {
  const values = inputs.map((input) => input.value);
  const duplicatesIndexes = getDuplicatesIndexes(values);
  const duplicateInputs = [];
  if (duplicatesIndexes.length) {
    duplicatesIndexes.forEach((i) => {
      duplicateInputs.push(inputs[i]);
    });
  }
  return duplicateInputs;
}

function getNumbersFromString(str) {
  try {
    const numbers = str.match(/\d+/g) || [];
    return numbers.map(Number);
  } catch (error) {
    return [];
  }
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

function validateArrayOnNumbersToHaveOnlyNumbersInRange(array, min = 1, max = 50) {
  return array.every((n) => !isNaN(n) && n >= min && n <= max);
}

function handleDJsName() {
  let djName = localStorage.getItem("djName") || "";
  while (!djName) {
    djName = prompt("Enter DJ's nickname");
    if (djName) {
      localStorage.setItem("djName", djName);
      document.querySelector(`strong#dj-name`).textContent = djName;
    }
  }
}

function getKeyByValueFromObject(object, value) {
  return +Object.keys(object).find((key) => object[key] === value);
}
