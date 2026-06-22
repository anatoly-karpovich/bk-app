import type { WithId } from "mongodb";
import { getJourneyAchievements, getJourneyConfig, getNonJackpotPrizes } from "./domain/config";
import { JourneyEngine } from "./JourneyEngine";
import type {
  JourneyGameListItemReadModel,
  JourneyGameReadModel,
  JourneyPlayer,
  JourneyPlayerReadModel,
} from "./domain/types";
import type { JourneyGameDocument } from "./JourneyRepository";

export class JourneyReadModelFactory {
  constructor(private readonly engine = new JourneyEngine()) {}

  create(document: WithId<JourneyGameDocument>): JourneyGameReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Journey response normalization failed");
    }

    const { playersById: _ignoredPlayersById, ...publicGame } = normalizedGame;

    return {
      id: _id.toHexString(),
      ...this.clone(publicGame),
      derived: {
        journeyConfig: getJourneyConfig(normalizedGame.rules),
        journeyAchievements: getJourneyAchievements(normalizedGame.rules),
        nonJackpotPrizes: getNonJackpotPrizes(normalizedGame.rules),
        gameIsOver: this.engine.isGameOver(normalizedGame),
        activePlayers: this.buildJourneyPlayerReadModels(this.engine.getActivePlayers(normalizedGame)),
        finishedPlayers: this.buildJourneyPlayerReadModels(this.engine.getFinishedPlayers(normalizedGame)),
        visiblePlayers: this.buildJourneyPlayerReadModels(this.engine.getVisiblePlayers(normalizedGame)),
        results: this.engine.getResults(normalizedGame).map((player) => this.clone(player)),
        receipts: this.engine.calculateReceiptsDistribution(normalizedGame),
        playerTimelines: this.engine.getPlayerTimelines(normalizedGame),
      },
    };
  }

  createListItem(document: WithId<JourneyGameDocument>): JourneyGameListItemReadModel {
    const { _id, ...game } = document;
    const normalizedGame = this.engine.normalizeGame(game);

    if (!normalizedGame) {
      throw new Error("Journey response normalization failed");
    }

    return {
      id: _id.toHexString(),
      createdAt: normalizedGame.createdAt,
      updatedAt: normalizedGame.updatedAt,
      status: normalizedGame.status,
      configId: normalizedGame.configId,
      configName: normalizedGame.configName,
      roundsCount: normalizedGame.rounds.length,
      players: normalizedGame.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        status: player.status,
        position: player.position,
        prize: player.prize,
      })),
    };
  }

  private buildJourneyPlayerReadModels(players: JourneyPlayer[]): JourneyPlayerReadModel[] {
    return players.map((player) => ({
      ...this.clone(player),
      fullPrize: this.engine.getPlayerFullPrize(player),
    }));
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
