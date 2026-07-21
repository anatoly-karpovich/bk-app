import type { WithId } from "mongodb";
import { getJourneyCollectorTargets } from "./domain/achievementProgress";
import { getJourneyAchievements, getJourneyConfig } from "./domain/config";
import { balanceToJourneyCurrencyValues } from "./domain/currency";
import type {
  JourneyAchievement,
  JourneyGameListItemReadModel,
  JourneyGameView,
  JourneyV2Game,
  JourneyV2Player,
} from "./domain/types";
import { JourneyV2Engine } from "./JourneyV2Engine";

/** Projects the only supported persisted Journey format into the public API model. */
export class JourneyReadModelFactory {
  constructor(private readonly engine = new JourneyV2Engine()) {}

  create(game: WithId<JourneyV2Game>): JourneyGameView {
    const players = game.stateV2.players.map((player) => this.toPlayerView(player, game));
    const activePlayerIds = game.stateV2.players.filter((player) => player.status === "active").map((player) => player.id);

    return {
      id: game._id.toHexString(),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      meta: {
        status: game.stateV2.status,
        isOver: activePlayerIds.length === 0,
        roundIndex: game.stateV2.moveIndex,
        djName: game.djName,
        projectId: game.projectId,
        configId: game.configId,
        configName: game.configName,
        forumTopicId: game.forumTopicId ?? null,
      },
      configuration: {
        currencies: this.clone(game.currencies),
        rules: this.clone(game.rules),
        journeyConfig: getJourneyConfig(game.rules, game.currencies),
        achievements: getJourneyAchievements(game.rules),
        collectorTargets: getJourneyCollectorTargets(game.rules),
      },
      state: {
        board: this.clone(game.stateV2.map),
        players,
        activePlayerIds,
        finishedPlayerIds: game.stateV2.players.filter((player) => player.status === "finished").map((player) => player.id),
        visiblePlayerIds: game.stateV2.players.filter((player) => player.status !== "removed").map((player) => player.id),
        resultPlayerIds: game.stateV2.players.filter((player) => player.status !== "removed").sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")).map((player) => player.id),
      },
      achievements: {
        progressByPlayerId: Object.fromEntries(game.stateV2.players.map((player) => [player.id, this.engine.getAchievementProgress(game, player)])),
      },
      history: { byPlayerId: this.engine.getPlayerTimelines(game) },
      forumLog: this.clone(game.stateV2.forumLog),
    };
  }

  createListItem(game: WithId<JourneyV2Game>): JourneyGameListItemReadModel {
    return {
      id: game._id.toHexString(),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      status: game.stateV2.status,
      djName: game.djName,
      projectId: game.projectId,
      configId: game.configId,
      configName: game.configName,
      currencies: this.clone(game.currencies),
      roundsCount: game.stateV2.rounds.length,
      players: game.stateV2.players.map((player) => ({ id: player.id, nickname: player.nickname, status: player.status, position: player.position, balanceEntries: balanceToJourneyCurrencyValues(player.balance, game.currencies) })),
    };
  }

  private toPlayerView(player: JourneyV2Player, game: JourneyV2Game): JourneyGameView["state"]["players"][number] {
    const achievements = getJourneyAchievements(game.rules);
    return {
      id: player.id,
      nickname: player.nickname,
      status: player.status,
      position: player.position,
      balanceEntries: balanceToJourneyCurrencyValues(player.balance, game.currencies),
      bonuses: player.achievementNames.map((name) => Object.values(achievements).find((achievement) => achievement.name === name)).filter((achievement): achievement is JourneyAchievement => Boolean(achievement)).map((achievement) => this.clone(achievement)),
    };
  }

  private clone<T>(value: T): T { return structuredClone(value); }
}
