import type { ResourceAmount, ResourceDefinition, RewardPool } from "../rewards/types";

export type BattleshipsGameStatus = "in_progress" | "finished";
export type BattleshipsShotResult = "miss" | "hit" | "kill";
export type BattleshipsChipColor = "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
export interface BattleshipsShipConfig { size: number; amount: number; }
export interface BattleshipsRewards { hit: RewardPool; destroyBonusByShipSize: Record<number, RewardPool>; }
export interface BattleshipsBoardRules { boardSize: number; ships: BattleshipsShipConfig[]; maxShots: number; rewards: BattleshipsRewards; }
export interface BattleshipsRules { selectedBoardSize: number; boards: Record<string, BattleshipsBoardRules>; }
export interface BattleshipsBoardCell { row: number; column: number; coordinateLabel: string; shipSize: number; hasShot: boolean; isHit: boolean; }
export interface BattleshipsRewardGrant { source: "hit" | "destroy_bonus" | "legacy"; rewards: ResourceAmount[]; }
export interface BattleshipsShot {
  createdAt: string; row: number; column: number; result: BattleshipsShotResult; rewardGrants: BattleshipsRewardGrant[];
  prizeDelta: ResourceAmount[]; totalPrize: ResourceAmount[]; shipSize: number | null; coordinateLabel: string; resultLabel: string;
}
export interface BattleshipsGameDerivedData { boardConfig: BattleshipsBoardRules; gameIsOver: boolean; attemptsLeft: number; currentPrize: ResourceAmount[]; boardLetters: string[]; destroyedShipsCount: number; totalShipsCount: number; fleetSummary: string[]; lastShot: BattleshipsShot | null; }
export interface BattleshipsPersistedGame {
  id: string; createdAt: string; updatedAt: string; status: BattleshipsGameStatus; playerName: string; djName: string; projectId: string; configId: string; configName: string;
  resources: ResourceDefinition[]; rules: BattleshipsRules; board: BattleshipsBoardCell[][]; ships: Array<{ size: number; cells: Array<{ row: number; column: number; isHit: boolean }> }>;
  shots: BattleshipsShot[]; derived: BattleshipsGameDerivedData;
}
export interface BattleshipsSavedGameSummary {
  id: string; createdAt: string; updatedAt: string; status: BattleshipsGameStatus; playerName: string; djName: string; projectId: string; configId: string; configName: string;
  boardSize: number; maxShots: number; attemptsLeft: number; currentPrize: ResourceAmount[]; resources: ResourceDefinition[]; shotsCount: number;
}
export interface BattleshipsStatusChip { label: string; color?: BattleshipsChipColor; }
