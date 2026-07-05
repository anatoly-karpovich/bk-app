export type LottoRewardDistributionMode = "full_per_winner" | "split_pool";
export type LottoGameStatus = "in_progress" | "finished";
export type LottoPlayerStatus = "active" | "removed" | "winner_first" | "winner_second";
export type LottoEventType = "number_drawn" | "player_removed" | "game_finished" | "prizes_awarded";

export interface LottoRules {
  min: number;
  max: number;
  cardNumbersAmount: number;
  firstPlacePrize: number;
  secondPlacePrize: number;
  rewardDistributionMode: LottoRewardDistributionMode;
}

export type LottoRulesInput = Partial<LottoRules>;

export interface LottoPlayer {
  id: string;
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

export interface LottoGame {
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: LottoGameStatus;
  djName: string;
  configId: string;
  configName: string;
  currency: string;
  rules: LottoRules;
  drawnNumbers: number[];
  availableNumbers: number[];
  players: LottoPlayer[];
  events: LottoEvent[];
}

export interface LottoPlayerReadModel extends LottoPlayer {
  matchedNumbers: number[];
  remainingNumbers: number[];
  remainingCount: number;
}

export interface LottoPrizeTableEntry {
  place: 1 | 2;
  playerId: string;
  nickname: string;
  remainingCount: number;
  prize: number;
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
  configId: string;
  configName: string;
  currency: string;
  drawCount: number;
  playersCount: number;
  firstPlaceWinners: string[];
}

export interface LottoCreatePlayerInput {
  nickname: string;
  cardNumbers: number[];
}
