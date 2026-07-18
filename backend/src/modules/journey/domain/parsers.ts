export function parsePlayerNamesFromForum(text: string, djName = ""): string[] {
  const nickNames: string[] = [];
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

export function parseMovesFromForum(text: string): Record<string, number> {
  const rows = text
    .split(/\r?\n/)
    .map((row: string) => row.trim())
    .filter(
      (row) =>
        row &&
        !row.includes("\u041e\u0442\u0432\u0435\u0442\u0438\u0442\u044c") &&
        !row.includes("\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u044b:"),
    );

  return rows
    .map((row: string, index: number): string | number | null => {
      if (index % 2 === 0) {
        return row.split(" [")[0].trim();
      }

      const digits = row.match(/\d+/);
      return digits ? Number.parseInt(digits[0], 10) : null;
    })
    .reduce<Record<string, number>>((accumulator, row, index, array) => {
      const previousRow = array[index - 1];

      if (index % 2 === 1 && typeof previousRow === "string" && typeof row === "number") {
        accumulator[previousRow] = row;
      }

      return accumulator;
    }, {});
}
