import type { WithId } from "mongodb";
import { LottoEngine } from "./LottoEngine";
import type { LottoGameListItemReadModel, LottoGameReadModel, LottoPrizeTableEntry } from "./domain/types";
import type { LottoGameDocument } from "./LottoRepository";

export class LottoReadModelFactory {
  constructor(private readonly engine = new LottoEngine()) {}

  create(document: WithId<LottoGameDocument>): LottoGameReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Lotto response normalization failed");
    }

    const players = this.engine.getPlayerViews(normalizedGame);
    const firstPlaceWinners = players.filter((player) => player.status === "winner_first");
    const secondPlaceWinners = players.filter((player) => player.status === "winner_second");
    const otherPrizePlayers =
      normalizedGame.status === "finished" && normalizedGame.rules.otherActivePlayersPrize > 0
        ? players.filter(
            (player) =>
              player.status === "active" &&
              !firstPlaceWinners.some((winner) => winner.id === player.id) &&
              !secondPlaceWinners.some((winner) => winner.id === player.id),
          )
        : [];

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
      configId: normalizedGame.configId,
      configName: normalizedGame.configName,
      currency: normalizedGame.currency,
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

    const rewardMode = game.rules.rewardDistributionMode;
    const resolvePrize = (totalPrize: number, winnersCount: number) =>
      rewardMode === "split_pool" && winnersCount > 0 ? Number((totalPrize / winnersCount).toFixed(2)) : totalPrize;

    return [
      ...firstPlaceWinners.map<LottoPrizeTableEntry>((player) => ({
        place: 1,
        placeLabel: "1 место",
        playerId: player.id,
        nickname: player.nickname,
        remainingCount: player.remainingCount,
        prize: resolvePrize(game.rules.firstPlacePrize, firstPlaceWinners.length),
        payoutStatus: rewardMode === "split_pool" ? "Доля банка" : "Полная выплата",
      })),
      ...secondPlaceWinners.map<LottoPrizeTableEntry>((player) => ({
        place: 2,
        placeLabel: "2 место",
        playerId: player.id,
        nickname: player.nickname,
        remainingCount: player.remainingCount,
        prize: resolvePrize(game.rules.secondPlacePrize, secondPlaceWinners.length),
        payoutStatus: rewardMode === "split_pool" ? "Доля банка" : "Полная выплата",
      })),
      ...otherPrizePlayers.map<LottoPrizeTableEntry>((player) => ({
        place: 3,
        placeLabel: "Остальные",
        playerId: player.id,
        nickname: player.nickname,
        remainingCount: player.remainingCount,
        prize: resolvePrize(game.rules.otherActivePlayersPrize, otherPrizePlayers.length),
        payoutStatus: rewardMode === "split_pool" ? "Доля банка" : "Полная выплата",
      })),
    ];
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
