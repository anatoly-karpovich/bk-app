export type RandomFn = () => number;

export type BattleshipsGameStatus = "in_progress" | "finished";
export type BattleshipsShotResult = "miss" | "hit" | "kill";

export interface BattleshipsShipConfig {
  size: number;
  amount: number;
}

export interface BattleshipsPrizes {
  shoot: number;
  destroyBonus: Record<number, number>;
}

export interface BattleshipsBoardRules {
  boardSize: number;
  ships: BattleshipsShipConfig[];
  maxShots: number;
  currency: string;
  prizes: BattleshipsPrizes;
}

export interface BattleshipsBoardRulesInput {
  boardSize?: number;
  ships?: BattleshipsShipConfig[];
  maxShots?: number;
  currency?: string;
  prizes?: {
    shoot?: number;
    destroyBonus?: Record<string | number, number>;
  };
}

export interface BattleshipsRules {
  selectedBoardSize: number;
  boards: Record<string, BattleshipsBoardRules>;
}

export interface BattleshipsRulesInput {
  selectedBoardSize?: number;
  boards?: Record<string | number, BattleshipsBoardRulesInput>;
}

export interface BattleshipsShipCell {
  row: number;
  column: number;
  isHit: boolean;
}

export interface BattleshipsShip {
  size: number;
  cells: BattleshipsShipCell[];
}

export interface BattleshipsShot {
  createdAt: string;
  row: number;
  column: number;
  result: BattleshipsShotResult;
  prizeDelta: number;
  totalPrize: number;
  shipSize: number | null;
}

export interface BattleshipsGame {
  createdAt: string;
  updatedAt: string;
  status: BattleshipsGameStatus;
  playerName: string;
  djName: string;
  configId: string;
  configName: string;
  rules: BattleshipsRules;
  board: number[][];
  ships: BattleshipsShip[];
  shots: BattleshipsShot[];
}

export interface BattleshipsBoardCellReadModel {
  row: number;
  column: number;
  coordinateLabel: string;
  shipSize: number;
  hasShot: boolean;
  isHit: boolean;
}

export interface BattleshipsShotReadModel extends BattleshipsShot {
  coordinateLabel: string;
  resultLabel: string;
}

export interface BattleshipsGameDerivedData {
  boardConfig: BattleshipsBoardRules;
  gameIsOver: boolean;
  attemptsLeft: number;
  currentPrize: number;
  boardLetters: string[];
  destroyedShipsCount: number;
  totalShipsCount: number;
  fleetSummary: string[];
  lastShot: BattleshipsShotReadModel | null;
}

export type BattleshipsGameReadModel = Omit<BattleshipsGame, "board" | "shots"> & {
  id: string;
  board: BattleshipsBoardCellReadModel[][];
  shots: BattleshipsShotReadModel[];
  derived: BattleshipsGameDerivedData;
};

export interface BattleshipsGameListItemReadModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BattleshipsGameStatus;
  playerName: string;
  djName: string;
  configId: string;
  configName: string;
  boardSize: number;
  maxShots: number;
  attemptsLeft: number;
  currentPrize: number;
  currency: string;
  shotsCount: number;
}

export interface BattleshipsShotInput {
  row: number;
  column: number;
}
