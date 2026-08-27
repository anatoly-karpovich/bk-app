import type { ResourceAmount, ResourceSnapshot, RewardPool } from "../../rewards";

export type RandomFn = () => number;
export type BattleshipsGameStatus = "in_progress" | "finished";
export type BattleshipsShotResult = "miss" | "hit" | "kill";

export interface BattleshipsShipConfig {
  size: number;
  amount: number;
}
export interface BattleshipsRewards {
  hit: RewardPool;
  destroyBonusByShipSize: Record<number, RewardPool>;
}
export interface BattleshipsBoardRules {
  boardSize: number;
  ships: BattleshipsShipConfig[];
  maxShots: number;
  rewards: BattleshipsRewards;
}
export interface BattleshipsBoardRulesInput {
  boardSize?: number;
  ships?: BattleshipsShipConfig[];
  maxShots?: number;
  rewards?: Partial<BattleshipsRewards>;
  /** Legacy currency-only configuration, normalized to rewards.all. */
  prizes?: {
    shoot?: Array<{ currencyId: string; value: number }>;
    destroyBonus?: Record<string | number, Array<{ currencyId: string; value: number }>>;
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
export interface BattleshipsRewardGrant {
  source: "hit" | "destroy_bonus" | "legacy";
  rewards: ResourceAmount[];
}
export interface BattleshipsShot {
  createdAt: string;
  row: number;
  column: number;
  result: BattleshipsShotResult;
  rewardGrants: BattleshipsRewardGrant[];
  prizeDelta: ResourceAmount[];
  totalPrize: ResourceAmount[];
  shipSize: number | null;
}
export interface BattleshipsGame {
  createdAt: string;
  updatedAt: string;
  /** Set while the game is finished; absent in older persisted games. */
  finishedAt?: string | null;
  /** Operator-selected calendar date of conduct; absent in older persisted games. */
  conductedOn?: string | null;
  status: BattleshipsGameStatus;
  playerName: string;
  /** Stable project-scoped Player identity; optional while reading older games. */
  playerRefId?: string;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  resources: ResourceSnapshot[];
  rules: BattleshipsRules;
  hostUserId?: string;
  hostSnapshot?: import("../../auth/domain/types").HostSnapshot;
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
  currentPrize: ResourceAmount[];
  boardLetters: string[];
  destroyedShipsCount: number;
  totalShipsCount: number;
  fleetSummary: string[];
  lastShot: BattleshipsShotReadModel | null;
}
export type BattleshipsGameReadModel = Omit<BattleshipsGame, "board" | "shots" | "playerRefId"> & {
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
  finishedAt: string | null;
  conductedOn: string | null;
  playerName: string;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  boardSize: number;
  maxShots: number;
  attemptsLeft: number;
  currentPrize: ResourceAmount[];
  resources: ResourceSnapshot[];
  shotsCount: number;
  hostUserId?: string;
}
export interface BattleshipsShotInput {
  row: number;
  column: number;
}

export interface BattleshipsPlayerIdentity {
  nickname: string;
  playerRefId: string;
}
