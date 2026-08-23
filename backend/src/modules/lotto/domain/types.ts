import type { ResourceAmount, ResourceSnapshot, RewardPool } from "../../rewards";

export type LottoRewardDistributionMode = "full_per_winner" | "split_pool";
export type LottoGameStatus = "in_progress" | "finished";
export type LottoPlayerStatus = "active" | "removed" | "winner_first" | "winner_second";
export type LottoEventType = "number_drawn" | "player_removed" | "game_finished" | "prizes_awarded";
export interface LottoRules {
  min: number;
  max: number;
  cardNumbersAmount: number;
  firstPlacePrize: RewardPool;
  secondPlacePrize: RewardPool;
  otherActivePlayersPrize: RewardPool;
  rewardDistributionMode: LottoRewardDistributionMode;
}
export type LottoRulesInput = Partial<LottoRules> & {
  firstPlacePrize?: RewardPool | Array<{ currencyId: string; value: number }>;
  secondPlacePrize?: RewardPool | Array<{ currencyId: string; value: number }>;
  otherActivePlayersPrize?: RewardPool | Array<{ currencyId: string; value: number }>;
};
export interface LottoPlayer {
  id: string;
  /** Stable project-scoped Player identity; optional while reading older games. */
  playerRefId?: string;
  nickname: string;
  status: LottoPlayerStatus;
  removedAt: string | null;
  removedReason: string | null;
  cardNumbers: number[];
}
export interface LottoEvent {
  createdAt: string;
  type: LottoEventType;
  message: string;
}
export type LottoPayoutPlace = 1 | 2 | 3;
export interface LottoPayout {
  playerId: string;
  place: LottoPayoutPlace;
  resolvedRewards: ResourceAmount[];
  awardedRewards: ResourceAmount[];
  payoutStatus: "full_per_winner" | "split_pool";
}
export interface LottoGame {
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: LottoGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  hostUserId?: string;
  hostSnapshot?: import("../../auth/domain/types").HostSnapshot;
  resources: ResourceSnapshot[];
  rules: LottoRules;
  drawnNumbers: number[];
  availableNumbers: number[];
  players: LottoPlayer[];
  payouts: LottoPayout[];
  events: LottoEvent[];
}
export interface LottoPlayerReadModel extends Omit<LottoPlayer, "playerRefId"> {
  matchedNumbers: number[];
  remainingNumbers: number[];
  remainingCount: number;
}
export interface LottoPrizeTableEntry {
  place: LottoPayoutPlace;
  placeLabel: string;
  playerId: string;
  nickname: string;
  remainingCount: number;
  prize: ResourceAmount[];
  payoutStatus: string;
}
export interface LottoGameDerivedData {
  gameIsOver: boolean;
  drawCount: number;
  lastDrawnNumber: number | null;
  activePlayers: LottoPlayerReadModel[];
  removedPlayers: LottoPlayerReadModel[];
  firstPlaceWinners: LottoPlayerReadModel[];
  secondPlaceWinners: LottoPlayerReadModel[];
  otherPrizePlayers: LottoPlayerReadModel[];
  legacySummaryText: string;
  prizeTable: LottoPrizeTableEntry[];
}
export type LottoGameReadModel = Omit<LottoGame, "players"> & {
  id: string;
  players: LottoPlayerReadModel[];
  derived: LottoGameDerivedData;
};
export interface LottoGameListItemReadModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: LottoGameStatus;
  djName: string;
  projectId: string;
  configId: string;
  configName: string;
  resources: ResourceSnapshot[];
  drawCount: number;
  playersCount: number;
  firstPlaceWinners: string[];
  hostUserId?: string;
}
export interface LottoCreatePlayerInput {
  nickname: string;
  playerRefId?: string | null;
  cardNumbers: number[];
}

export interface LottoResolvedCreatePlayerInput {
  nickname: string;
  playerRefId: string;
  cardNumbers: number[];
}
