import type { WithId } from "mongodb";
import {
  buildBattleshipsFleetSummary,
  formatBattleshipsShotResult,
  getBattleshipsBoardConfig,
  getBattleshipsBoardLetters,
  toBattleshipsCoordinateLabel,
} from "./domain/config";
import type {
  BattleshipsBoardCellReadModel,
  BattleshipsGameListItemReadModel,
  BattleshipsGameReadModel,
  BattleshipsShotReadModel,
} from "./domain/types";
import { BattleshipsEngine } from "./BattleshipsEngine";
import type { BattleshipsGameDocument } from "./BattleshipsRepository";

export class BattleshipsReadModelFactory {
  constructor(private readonly engine: BattleshipsEngine) {}

  create(document: WithId<BattleshipsGameDocument>): BattleshipsGameReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Battleships response normalization failed");
    }

    const boardConfig = getBattleshipsBoardConfig(normalizedGame.rules);
    const shots = normalizedGame.shots.map((shot) => this.buildShotReadModel(shot, boardConfig.boardSize));
    const { board: _rawBoard, shots: _rawShots, ...publicGame } = normalizedGame;

    return {
      id: _id.toHexString(),
      ...this.clone(publicGame),
      board: this.buildBoardReadModel(normalizedGame.board, normalizedGame.shots),
      shots,
      derived: {
        boardConfig: this.clone(boardConfig),
        gameIsOver: this.engine.isGameOver(normalizedGame),
        attemptsLeft: this.engine.getAttemptsLeft(normalizedGame),
        currentPrize: this.clone(this.engine.getCurrentPrize(normalizedGame)),
        boardLetters: getBattleshipsBoardLetters(boardConfig.boardSize),
        destroyedShipsCount: this.engine.getDestroyedShipsCount(normalizedGame),
        totalShipsCount: normalizedGame.ships.length,
        fleetSummary: buildBattleshipsFleetSummary(boardConfig),
        lastShot: shots.at(-1) ?? null,
      },
    };
  }

  createListItem(document: WithId<BattleshipsGameDocument>): BattleshipsGameListItemReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Battleships response normalization failed");
    }

    const boardConfig = getBattleshipsBoardConfig(normalizedGame.rules);

    return {
      id: _id.toHexString(),
      createdAt: normalizedGame.createdAt,
      updatedAt: normalizedGame.updatedAt,
      status: normalizedGame.status,
      playerName: normalizedGame.playerName,
      djName: normalizedGame.djName,
      projectId: normalizedGame.projectId,
      configId: normalizedGame.configId,
      configName: normalizedGame.configName,
      boardSize: boardConfig.boardSize,
      maxShots: boardConfig.maxShots,
      attemptsLeft: this.engine.getAttemptsLeft(normalizedGame),
      currentPrize: this.clone(this.engine.getCurrentPrize(normalizedGame)),
      resources: this.clone(normalizedGame.resources),
      shotsCount: normalizedGame.shots.length,
    };
  }

  private buildBoardReadModel(
    board: number[][],
    shots: BattleshipsGameDocument["shots"],
  ): BattleshipsBoardCellReadModel[][] {
    const shotCoordinates = new Set<string>(shots.map((shot) => this.toCoordinateKey(shot.row, shot.column)));
    const hitCoordinates = new Set<string>(
      shots.filter((shot) => shot.shipSize !== null).map((shot) => this.toCoordinateKey(shot.row, shot.column)),
    );

    return board.map((rowCells, rowIndex) =>
      rowCells.map((shipSize, columnIndex) => {
        const row = rowIndex + 1;
        const column = columnIndex + 1;
        const key = this.toCoordinateKey(row, column);

        return {
          row,
          column,
          coordinateLabel: toBattleshipsCoordinateLabel(row, column, board.length),
          shipSize,
          hasShot: shotCoordinates.has(key),
          isHit: hitCoordinates.has(key),
        };
      }),
    );
  }

  private buildShotReadModel(
    shot: BattleshipsGameDocument["shots"][number],
    boardSize: number,
  ): BattleshipsShotReadModel {
    return {
      ...this.clone(shot),
      coordinateLabel: toBattleshipsCoordinateLabel(shot.row, shot.column, boardSize),
      resultLabel: formatBattleshipsShotResult(shot.result),
    };
  }

  private toCoordinateKey(row: number, column: number): string {
    return `${row}:${column}`;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
