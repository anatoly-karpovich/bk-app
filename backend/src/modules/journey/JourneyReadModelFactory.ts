import type { WithId } from "mongodb";
import type { ConfigCurrency } from "../configs/domain/types";
import { balanceToJourneyCurrencyValues } from "./domain/currency";
import { getCollectibleJourneyCells, getJourneyAchievements, getJourneyConfig } from "./domain/config";
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
        journeyConfig: getJourneyConfig(normalizedGame.rules, normalizedGame.currencies),
        journeyAchievements: getJourneyAchievements(normalizedGame.rules),
        collectibleCells: getCollectibleJourneyCells(normalizedGame.rules),
        gameIsOver: this.engine.isGameOver(normalizedGame),
        activePlayers: this.buildJourneyPlayerReadModels(this.engine.getActivePlayers(normalizedGame), normalizedGame.currencies),
        finishedPlayers: this.buildJourneyPlayerReadModels(this.engine.getFinishedPlayers(normalizedGame), normalizedGame.currencies),
        visiblePlayers: this.buildJourneyPlayerReadModels(this.engine.getVisiblePlayers(normalizedGame), normalizedGame.currencies),
        results: this.buildJourneyPlayerReadModels(this.engine.getResults(normalizedGame), normalizedGame.currencies),
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
      djName: normalizedGame.djName,
      projectId: normalizedGame.projectId,
      configId: normalizedGame.configId,
      configName: normalizedGame.configName,
      currencies: this.clone(normalizedGame.currencies),
      roundsCount: normalizedGame.rounds.length,
      players: normalizedGame.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        status: player.status,
        position: player.position,
        balanceEntries: balanceToJourneyCurrencyValues(player.balance, normalizedGame.currencies),
      })),
    };
  }

  private buildJourneyPlayerReadModels(
    players: JourneyPlayer[],
    currencies: ConfigCurrency[],
  ): JourneyPlayerReadModel[] {
    return players.map((player) => ({
      ...this.clone(player),
      balanceEntries: balanceToJourneyCurrencyValues(player.balance, currencies),
    }));
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
