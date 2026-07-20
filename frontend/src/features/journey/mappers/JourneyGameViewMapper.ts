import type { JourneyGameView, JourneyPageGame, JourneyPlayerReadModel } from "../types";

/** Converts the API contract into the small shape composed by JourneyPage. */
export class JourneyGameViewMapper {
  toPageGame(game: JourneyGameView): JourneyPageGame {
    const playersById = new Map(game.state.players.map((player) => [player.id, player]));

    return {
      id: game.id,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      status: game.meta.status,
      gameIsOver: game.meta.isOver,
      roundsCount: game.meta.roundIndex,
      djName: game.meta.djName,
      projectId: game.meta.projectId,
      configId: game.meta.configId,
      configName: game.meta.configName,
      currencies: game.configuration.currencies,
      rules: game.configuration.rules,
      map: game.state.board,
      players: game.state.players,
      activePlayers: this.mapPlayers(game.state.activePlayerIds, playersById),
      finishedPlayers: this.mapPlayers(game.state.finishedPlayerIds, playersById),
      visiblePlayers: this.mapPlayers(game.state.visiblePlayerIds, playersById),
      results: this.mapPlayers(game.state.resultPlayerIds, playersById),
      journeyConfig: game.configuration.journeyConfig,
      journeyAchievements: game.configuration.achievements,
      collectorTargets: game.configuration.collectorTargets,
      achievementProgressByPlayerId: game.achievements.progressByPlayerId,
      playerTimelines: game.history.byPlayerId,
      forumLog: game.forumLog,
    };
  }

  private mapPlayers(ids: string[], playersById: Map<string, JourneyPlayerReadModel>): JourneyPlayerReadModel[] {
    return ids.flatMap((playerId) => {
      const player = playersById.get(playerId);
      return player ? [player] : [];
    });
  }
}

export const journeyGameViewMapper = new JourneyGameViewMapper();
