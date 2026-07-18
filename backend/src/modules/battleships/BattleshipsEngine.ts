import { addCurrencyValues, normalizeCurrencyValues } from "../../common/currencyValues";
import type { ConfigCurrency } from "../configs/domain/types";
import { createDefaultConfigCurrency, normalizeConfigCurrencies } from "../configs/domain/normalizeConfig";
import { getBattleshipsBoardConfig, normalizeBattleshipsRules } from "./domain/config";
import type {
  BattleshipsBoardRules,
  BattleshipsCurrencyValue,
  BattleshipsGame,
  BattleshipsRules,
  BattleshipsShip,
  BattleshipsShipCell,
  BattleshipsShot,
  BattleshipsShotInput,
  RandomFn,
} from "./domain/types";
import { BattleshipsShotValidationError } from "./errors";

type LegacyBattleshipsBoardRules = {
  boardSize: number;
  ships: BattleshipsBoardRules["ships"];
  maxShots: number;
  currency?: string;
  prizes: {
    shoot?: BattleshipsCurrencyValue[] | number;
    destroyBonus?: Record<string | number, BattleshipsCurrencyValue[] | number>;
  };
};

type LegacyBattleshipsRules = {
  selectedBoardSize: number;
  boards: Record<string, LegacyBattleshipsBoardRules>;
};

type LegacyBattleshipsShot = Omit<BattleshipsShot, "prizeDelta" | "totalPrize"> & {
  prizeDelta?: BattleshipsCurrencyValue[] | number;
  totalPrize?: BattleshipsCurrencyValue[] | number;
};

type LegacyBattleshipsGame = Omit<BattleshipsGame, "rules" | "currencies" | "shots"> & {
  currencies?: ConfigCurrency[];
  rules: LegacyBattleshipsRules;
  shots: LegacyBattleshipsShot[];
};

export class BattleshipsEngine {
  normalizeGame(game: BattleshipsGame | null): BattleshipsGame | null {
    if (!game) {
      return null;
    }

    const legacyGame = this.clone(game) as LegacyBattleshipsGame;
    const legacyCurrencyLabel = this.resolveLegacyCurrencyLabel(legacyGame.rules);
    const currencies = this.normalizeCurrencies(legacyGame.currencies, legacyCurrencyLabel);
    const defaultCurrencyId = currencies[0]?.id ?? "default";
    const normalizedGame: BattleshipsGame = {
      ...legacyGame,
      playerName: legacyGame.playerName.trim(),
      djName: legacyGame.djName.trim(),
      projectId: legacyGame.projectId?.trim() ?? "",
      configId: legacyGame.configId.trim(),
      configName: legacyGame.configName.trim(),
      currencies,
      rules: normalizeBattleshipsRules(this.normalizeLegacyRules(legacyGame.rules, defaultCurrencyId)),
      shots: this.normalizeShots(legacyGame.shots, defaultCurrencyId),
    };

    normalizedGame.status = this.computeStatus(normalizedGame);

    return normalizedGame;
  }

  createGame(
    playerName: string,
    options: {
      randomFn?: RandomFn;
      rules: BattleshipsRules;
      currencies: ConfigCurrency[];
      djName?: string;
      projectId?: string;
      configId?: string;
      configName?: string;
    },
  ): BattleshipsGame {
    const now = new Date().toISOString();
    const rules = normalizeBattleshipsRules(options.rules);
    const currencies = this.normalizeCurrencies(options.currencies);
    const boardConfig = getBattleshipsBoardConfig(rules);
    const { board, ships } = this.generateBoard(boardConfig, options.randomFn);

    return {
      createdAt: now,
      updatedAt: now,
      status: "in_progress",
      playerName: playerName.trim(),
      djName: options.djName?.trim() ?? "",
      projectId: options.projectId?.trim() ?? "",
      configId: options.configId?.trim() ?? "",
      configName: options.configName?.trim() ?? "",
      currencies,
      rules,
      board,
      ships,
      shots: [],
    };
  }

  makeShot(game: BattleshipsGame, input: BattleshipsShotInput): BattleshipsGame {
    const normalizedGame = this.normalizeGame(game);

    if (!normalizedGame) {
      throw new BattleshipsShotValidationError("Battleships shot validation failed: game is missing");
    }

    const nextGame = this.clone(normalizedGame);
    const boardConfig = getBattleshipsBoardConfig(nextGame.rules);
    const row = Math.trunc(input.row);
    const column = Math.trunc(input.column);

    this.assertShotAllowed(nextGame, boardConfig, row, column);

    const previousPrize = this.getCurrentPrize(nextGame);
    const ship = this.findShipByCoordinates(nextGame.ships, row, column);
    const shipCell = ship?.cells.find((cell) => cell.row === row && cell.column === column) ?? null;

    let result: "miss" | "hit" | "kill" = "miss";
    let prizeDelta: BattleshipsCurrencyValue[] = [];
    let shipSize: number | null = null;

    if (ship && shipCell) {
      shipCell.isHit = true;
      shipSize = ship.size;
      result = ship.cells.every((cell) => cell.isHit) ? "kill" : "hit";
      prizeDelta =
        result === "kill"
          ? addCurrencyValues(boardConfig.prizes.shoot, boardConfig.prizes.destroyBonus[ship.size] ?? [])
          : normalizeCurrencyValues(boardConfig.prizes.shoot);
    }

    nextGame.shots.push({
      createdAt: new Date().toISOString(),
      row,
      column,
      result,
      prizeDelta,
      totalPrize: addCurrencyValues(previousPrize, prizeDelta),
      shipSize,
    });

    return this.finalizeGame(nextGame);
  }

  undoLastShot(game: BattleshipsGame): BattleshipsGame {
    const normalizedGame = this.normalizeGame(game);

    if (!normalizedGame) {
      throw new BattleshipsShotValidationError("Battleships undo failed: game is missing");
    }

    if (!normalizedGame.shots.length) {
      throw new BattleshipsShotValidationError("Battleships undo failed: there are no shots to undo");
    }

    const nextGame = this.clone(normalizedGame);
    const lastShot = nextGame.shots.pop();

    if (!lastShot) {
      throw new BattleshipsShotValidationError("Battleships undo failed: there are no shots to undo");
    }

    if (lastShot.shipSize !== null) {
      const ship = this.findShipByCoordinates(nextGame.ships, lastShot.row, lastShot.column);
      const shipCell = ship?.cells.find((cell) => cell.row === lastShot.row && cell.column === lastShot.column) ?? null;

      if (shipCell) {
        shipCell.isHit = false;
      }
    }

    nextGame.shots = this.normalizeShots(nextGame.shots, nextGame.currencies[0]?.id ?? "default");
    return this.finalizeGame(nextGame);
  }

  isGameOver(game: BattleshipsGame): boolean {
    return this.computeStatus(game) === "finished";
  }

  getAttemptsLeft(game: BattleshipsGame): number {
    const boardConfig = getBattleshipsBoardConfig(game.rules);
    return Math.max(0, boardConfig.maxShots - game.shots.length);
  }

  getCurrentPrize(game: BattleshipsGame): BattleshipsCurrencyValue[] {
    return addCurrencyValues(...game.shots.map((shot) => shot.prizeDelta));
  }

  getDestroyedShipsCount(game: BattleshipsGame): number {
    return game.ships.filter((ship) => ship.cells.every((cell) => cell.isHit)).length;
  }

  private finalizeGame(game: BattleshipsGame): BattleshipsGame {
    game.updatedAt = new Date().toISOString();
    game.status = this.computeStatus(game);
    return game;
  }

  private computeStatus(game: BattleshipsGame): "in_progress" | "finished" {
    return this.getAttemptsLeft(game) <= 0 || this.getDestroyedShipsCount(game) === game.ships.length
      ? "finished"
      : "in_progress";
  }

  private assertShotAllowed(
    game: BattleshipsGame,
    boardConfig: BattleshipsBoardRules,
    row: number,
    column: number,
  ): void {
    if (game.status === "finished") {
      throw new BattleshipsShotValidationError("Battleships shot validation failed: game is already finished");
    }

    if (!Number.isInteger(row) || !Number.isInteger(column)) {
      throw new BattleshipsShotValidationError("Battleships shot validation failed: row and column must be integers");
    }

    if (row < 1 || row > boardConfig.boardSize || column < 1 || column > boardConfig.boardSize) {
      throw new BattleshipsShotValidationError("Battleships shot validation failed: coordinates are outside the board");
    }

    if (game.shots.some((shot) => shot.row === row && shot.column === column)) {
      throw new BattleshipsShotValidationError("Battleships shot validation failed: coordinate has already been used");
    }
  }

  private generateBoard(boardConfig: BattleshipsBoardRules, randomFn: RandomFn = Math.random) {
    for (let boardAttempt = 0; boardAttempt < 10000; boardAttempt += 1) {
      const board = this.createEmptyBoard(boardConfig.boardSize);
      const ships: BattleshipsShip[] = [];
      let isSuccess = true;

      try {
        for (const shipConfig of boardConfig.ships) {
          for (let shipIndex = 0; shipIndex < shipConfig.amount; shipIndex += 1) {
            this.placeShip(board, ships, boardConfig.boardSize, shipConfig.size, randomFn);
          }
        }
      } catch {
        isSuccess = false;
      }

      if (isSuccess) {
        return { board, ships };
      }
    }

    throw new Error("Failed to place battleships ships on the board");
  }

  private placeShip(
    board: number[][],
    ships: BattleshipsShip[],
    boardSize: number,
    shipSize: number,
    randomFn: RandomFn,
  ): void {
    for (let placementAttempt = 0; placementAttempt < 1000; placementAttempt += 1) {
      const isVertical = randomFn() < 0.5;
      const startRow = Math.floor(randomFn() * boardSize);
      const startColumn = Math.floor(randomFn() * boardSize);

      if (!this.isValidPlacement(board, boardSize, startRow, startColumn, shipSize, isVertical)) {
        continue;
      }

      const cells: BattleshipsShipCell[] = [];

      for (let step = 0; step < shipSize; step += 1) {
        const rowIndex = isVertical ? startRow + step : startRow;
        const columnIndex = isVertical ? startColumn : startColumn + step;
        board[rowIndex][columnIndex] = shipSize;
        cells.push({
          row: rowIndex + 1,
          column: columnIndex + 1,
          isHit: false,
        });
      }

      ships.push({
        size: shipSize,
        cells,
      });

      return;
    }

    throw new Error("Failed to place a battleships ship");
  }

  private isValidPlacement(
    board: number[][],
    boardSize: number,
    startRow: number,
    startColumn: number,
    shipSize: number,
    isVertical: boolean,
  ): boolean {
    const endRow = isVertical ? startRow + shipSize - 1 : startRow;
    const endColumn = isVertical ? startColumn : startColumn + shipSize - 1;

    if (endRow >= boardSize || endColumn >= boardSize) {
      return false;
    }

    for (let rowIndex = startRow - 1; rowIndex <= endRow + 1; rowIndex += 1) {
      for (let columnIndex = startColumn - 1; columnIndex <= endColumn + 1; columnIndex += 1) {
        if (rowIndex < 0 || rowIndex >= boardSize || columnIndex < 0 || columnIndex >= boardSize) {
          continue;
        }

        if (board[rowIndex][columnIndex] !== 0) {
          return false;
        }
      }
    }

    return true;
  }

  private createEmptyBoard(boardSize: number): number[][] {
    return Array.from({ length: boardSize }, () => Array.from({ length: boardSize }, () => 0));
  }

  private findShipByCoordinates(ships: BattleshipsShip[], row: number, column: number): BattleshipsShip | null {
    return ships.find((ship) => ship.cells.some((cell) => cell.row === row && cell.column === column)) ?? null;
  }

  private normalizeLegacyRules(rules: LegacyBattleshipsRules, defaultCurrencyId: string): BattleshipsRules {
    return {
      selectedBoardSize: rules.selectedBoardSize,
      boards: Object.fromEntries(
        Object.entries(rules.boards).map(([boardKey, board]) => [
          boardKey,
          {
            boardSize: board.boardSize,
            ships: board.ships,
            maxShots: board.maxShots,
            prizes: {
              shoot: this.toCurrencyValues(board.prizes?.shoot, defaultCurrencyId),
              destroyBonus: Object.fromEntries(
                Object.entries(board.prizes?.destroyBonus ?? {}).map(([size, rewardSet]) => [
                  size,
                  this.toCurrencyValues(rewardSet, defaultCurrencyId),
                ]),
              ),
            },
          },
        ]),
      ),
    };
  }

  private normalizeShots(shots: LegacyBattleshipsShot[], defaultCurrencyId: string): BattleshipsShot[] {
    let runningTotal: BattleshipsCurrencyValue[] = [];

    return shots.map((shot) => {
      const prizeDelta = this.toCurrencyValues(shot.prizeDelta, defaultCurrencyId);
      runningTotal = addCurrencyValues(runningTotal, prizeDelta);

      return {
        ...shot,
        prizeDelta,
        totalPrize: runningTotal,
      };
    });
  }

  private toCurrencyValues(
    values: BattleshipsCurrencyValue[] | number | undefined,
    defaultCurrencyId: string,
  ): BattleshipsCurrencyValue[] {
    if (Array.isArray(values)) {
      return normalizeCurrencyValues(values);
    }

    if (!Number.isFinite(values)) {
      return [];
    }

    const numericValue = Number(values);
    return [{ currencyId: defaultCurrencyId, value: Number(numericValue.toFixed(2)) }];
  }

  private normalizeCurrencies(currencies: ConfigCurrency[] | undefined, legacyCurrencyLabel?: string): ConfigCurrency[] {
    const normalizedCurrencies = normalizeConfigCurrencies(currencies ?? []);

    if (normalizedCurrencies.length) {
      return normalizedCurrencies;
    }

    return [createDefaultConfigCurrency(legacyCurrencyLabel)];
  }

  private resolveLegacyCurrencyLabel(rules: LegacyBattleshipsRules): string | undefined {
    return Object.values(rules.boards ?? {}).find((board) => typeof board.currency === "string")?.currency;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
