export type LottoRewardDistributionMode = "full_per_winner" | "split_pool";
export type LottoGameStatus = "in_progress" | "finished";
export type LottoPlayerStatus = "active" | "removed" | "winner_first" | "winner_second";
export type LottoEventType = "number_drawn" | "player_removed" | "game_finished" | "prizes_awarded";
export type LottoChipColor = "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";

export interface LottoRules {
  min: number;
  max: number;
  cardNumbersAmount: number;
  firstPlacePrize: number;
  secondPlacePrize: number;
  otherActivePlayersPrize: number;
  rewardDistributionMode: LottoRewardDistributionMode;
}

export interface LottoPlayer {
  id: string;
  nickname: string;
  status: LottoPlayerStatus;
  removedAt: string | null;
  removedReason: string | null;
  cardNumbers: number[];
  matchedNumbers: number[];
  remainingNumbers: number[];
  remainingCount: number;
}

export interface LottoEvent {
  createdAt: string;
  type: LottoEventType;
  message: string;
}

export interface LottoPrizeTableEntry {
  place: 1 | 2 | 3;
  placeLabel: string;
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
  activePlayers: LottoPlayer[];
  removedPlayers: LottoPlayer[];
  firstPlaceWinners: LottoPlayer[];
  secondPlaceWinners: LottoPlayer[];
  otherPrizePlayers: LottoPlayer[];
  legacySummaryText: string;
  prizeTable: LottoPrizeTableEntry[];
}

export interface LottoPersistedGame {
  id: string;
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
  derived: LottoGameDerivedData;
}

export interface LottoSavedGameSummary {
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

export interface LottoStatusChip {
  label: string;
  color?: LottoChipColor;
}

export interface LottoSetupPlayerInput {
  id: string;
  nickname: string;
  cardNumbers: string;
}

export interface LottoSetupPlayerInputError {
  nickname: string | null;
  cardNumbers: string | null;
}
