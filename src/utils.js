function generateNumberInRange(min = 1, max = 50) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getUniqueRandomNumber = (min, max) => {
  const generatedNumbers = [];
  return () => {
    if (generatedNumbers.length === max + 1) {
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

function generateTextInput(options) {
  return `<input type="text" class="form-control"  
  ${Object.keys(options)
    .map((key) => `${key}="${options[key]}"`)
    .join(" ")}
    >`;
}

function generateNumberInput(options) {
  return `<input number="number" class="form-control" 
  ${Object.keys(options)
    .map((key) => `${key}="${options[key]}"`)
    .join(" ")}
  >`;
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
