export function parsePlayerNamesFromForum(text, djName = "") {
  const nickNames = [];
  let isNickNameChunk = false;
  let currentNick = "";

  for (const char of text) {
    if (char === "[") {
      isNickNameChunk = true;
      currentNick = "";
      continue;
    }

    if (char === "]") {
      isNickNameChunk = false;
      if (currentNick.includes(",")) {
        continue;
      }
      if (currentNick.trim() && currentNick.trim() !== djName.trim()) {
        nickNames.push(currentNick.trim());
      }
      continue;
    }

    if (isNickNameChunk) {
      currentNick += char;
    }
  }

  return [...new Set(nickNames)];
}

export function parseMovesFromForum(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row && !row.includes("Ответить") && !row.includes("Страницы:"));

  return rows
    .map((row, index) => {
      if (index % 2 === 0) {
        return row.split(" [")[0].trim();
      }
      const digits = row.match(/\d+/);
      return digits ? Number.parseInt(digits[0], 10) : null;
    })
    .reduce((accumulator, row, index, array) => {
      if (index % 2 === 1 && array[index - 1] && row !== null) {
        accumulator[array[index - 1]] = row;
      }
      return accumulator;
    }, {});
}

