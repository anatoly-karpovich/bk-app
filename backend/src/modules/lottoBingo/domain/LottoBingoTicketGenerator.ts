import { randomInt } from "node:crypto";
import type { LottoBingoTicketGrid } from "./types";

export interface RandomSource {
  next(): number;
}
export class CryptoRandomSource implements RandomSource {
  next(): number {
    return randomInt(0, 0x1_0000_0000) / 0x1_0000_0000;
  }
}

export class LottoBingoTicketGenerator {
  constructor(private readonly random: RandomSource = new CryptoRandomSource()) {}

  generate(): LottoBingoTicketGrid {
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const rows = Array.from({ length: 6 }, () => this.pickColumns());
      if (new Set(rows.flat()).size !== 9) continue;
      const grid = Array.from({ length: 6 }, () => Array<number | null>(9).fill(null));
      for (let column = 0; column < 9; column += 1) {
        const rowsForColumn = rows.flatMap((columns, rowIndex) => (columns.includes(column) ? [rowIndex] : []));
        const numbers = this.shuffle(this.rangeForColumn(column)).slice(0, rowsForColumn.length);
        rowsForColumn.forEach((row, index) => {
          grid[row][column] = numbers[index];
        });
      }
      return grid;
    }
    throw new Error("Lotto Bingo ticket generation retry limit reached");
  }

  private pickColumns(): number[] {
    return this.shuffle([...Array(9).keys()])
      .slice(0, 5)
      .sort((a, b) => a - b);
  }
  private rangeForColumn(column: number): number[] {
    const start = column === 0 ? 1 : column * 10;
    const end = column === 8 ? 90 : column * 10 + 9;
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  shuffle<T>(values: T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.random.next() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
}
