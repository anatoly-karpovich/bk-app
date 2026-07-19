import type { CurrencyValue } from "../../../common/currencyValues";
import type { CurrencySnapshot } from "../../../common/currency";

export type RandomFn = () => number;

export type BattleshipsGameStatus = "in_progress" | "finished";
export type BattleshipsShotResult = "miss" | "hit" | "kill";

export interface BattleshipsShipConfig {
  size: number;
  amount: number;
}

export interface BattleshipsCurrencyValue extends CurrencyValue {}

export interface BattleshipsPrizes {
  shoot: BattleshipsCurrencyValue[];
  destroyBonus: Record<number, BattleshipsCurrencyValue[]>;
}

export interface BattleshipsBoardRules {
  boardSize: number;
  ships: BattleshipsShipConfig[];
  maxShots: number;
  prizes: BattleshipsPrizes;
}

export interface BattleshipsBoardRulesInput {
  boardSize?: number;
  ships?: BattleshipsShipConfig[];
  maxShots?: number;
  prizes?: {
    shoot?: BattleshipsCurrencyValue[];
    destroyBonus?: Record<string | number, BattleshipsCurrencyValue[]>;
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
  prizeDelta: BattleshipsCurrencyValue[];
  totalPrize: BattleshipsCurrencyValue[];
  shipSize: number | null;
}

export interface BattleshipsGame {
  createdAt: string;
  updatedAt: string;
  status: BattleshipsGameStatus;
  playerName: string;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  currencies: CurrencySnapshot[];
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
  currentPrize: BattleshipsCurrencyValue[];
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
  projectId: string;
  configId: string;
  configName: string;
  boardSize: number;
  maxShots: number;
  attemptsLeft: number;
  currentPrize: BattleshipsCurrencyValue[];
  currencies: CurrencySnapshot[];
  shotsCount: number;
}

export interface BattleshipsShotInput {
  row: number;
  column: number;
}
