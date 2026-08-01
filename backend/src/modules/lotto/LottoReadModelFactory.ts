import type { WithId } from "mongodb";
import { LottoEngine } from "./LottoEngine";
import type { LottoGameListItemReadModel, LottoGameReadModel, LottoPrizeTableEntry } from "./domain/types";
import type { LottoGameDocument } from "./LottoRepository";

export class LottoReadModelFactory {
  constructor(private readonly engine: LottoEngine) {}

  create(document: WithId<LottoGameDocument>): LottoGameReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Lotto response normalization failed");
    }

    const players = this.engine.getPlayerViews(normalizedGame);
    const firstPlaceWinners = players.filter((player) => player.status === "winner_first");
    const secondPlaceWinners = players.filter((player) => player.status === "winner_second");
    const otherPrizePlayers = players.filter((player) => normalizedGame.payouts.some((payout) => payout.place === 3 && payout.playerId === player.id));

    return {
      id: _id.toHexString(),
      ...this.clone(normalizedGame),
      players,
      derived: {
        gameIsOver: normalizedGame.status === "finished",
        drawCount: normalizedGame.drawnNumbers.length,
        lastDrawnNumber: normalizedGame.drawnNumbers.at(-1) ?? null,
        activePlayers: players.filter((player) => player.status !== "removed"),
        removedPlayers: players.filter((player) => player.status === "removed"),
        firstPlaceWinners,
        secondPlaceWinners,
        otherPrizePlayers,
        legacySummaryText: this.engine.getLegacySummaryText(normalizedGame),
        prizeTable: this.buildPrizeTable(normalizedGame, firstPlaceWinners, secondPlaceWinners, otherPrizePlayers),
      },
    };
  }

  createListItem(document: WithId<LottoGameDocument>): LottoGameListItemReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Lotto response normalization failed");
    }

    return {
      id: _id.toHexString(),
      createdAt: normalizedGame.createdAt,
      updatedAt: normalizedGame.updatedAt,
      finishedAt: normalizedGame.finishedAt,
      status: normalizedGame.status,
      djName: normalizedGame.djName,
      projectId: normalizedGame.projectId,
      configId: normalizedGame.configId,
      configName: normalizedGame.configName,
      resources: this.clone(normalizedGame.resources),
      drawCount: normalizedGame.drawnNumbers.length,
      playersCount: normalizedGame.players.filter((player) => player.status !== "removed").length,
      firstPlaceWinners: this.engine.getFirstPlaceWinners(normalizedGame).map((player) => player.nickname),
    };
  }

  private buildPrizeTable(
    game: LottoGameDocument,
    firstPlaceWinners: LottoGameReadModel["derived"]["firstPlaceWinners"],
    secondPlaceWinners: LottoGameReadModel["derived"]["secondPlaceWinners"],
    otherPrizePlayers: LottoGameReadModel["derived"]["otherPrizePlayers"],
  ): LottoPrizeTableEntry[] {
    if (game.status !== "finished") {
      return [];
    }

    const playersById = new Map([...firstPlaceWinners, ...secondPlaceWinners, ...otherPrizePlayers].map((player) => [player.id, player]));
    return game.payouts.map<LottoPrizeTableEntry>((payout) => {
      const player = playersById.get(payout.playerId)!;
      return { place: payout.place, placeLabel: payout.place === 1 ? "1 место" : payout.place === 2 ? "2 место" : "Остальные", playerId: player.id, nickname: player.nickname, remainingCount: player.remainingCount, prize: this.clone(payout.awardedRewards), payoutStatus: payout.payoutStatus === "split_pool" ? "Доля банка" : "Полная выплата" };
    });
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
