import type { WithId } from "mongodb";
import type { ResourceAmount } from "../rewards";
import {
  getJourneyAchievements,
  getJourneyCellKey,
  getJourneyCellMapLabel,
  getJourneyConfig,
} from "./domain/config";
import type {
  JourneyGameListItemReadModel,
  JourneyGameView,
  JourneyV2Game,
  JourneyV2Player,
} from "./domain/types";
import { JourneyV2Engine } from "./JourneyV2Engine";

export class JourneyReadModelFactory {
  constructor(private readonly engine: JourneyV2Engine) {}
  create(game: WithId<JourneyV2Game>): JourneyGameView {
    const activePlayerIds = game.stateV2.players
      .filter((player) => player.status === "active")
      .map((player) => player.id);
    return {
      id: game._id.toHexString(),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      meta: {
        status: game.stateV2.status,
        isOver: !activePlayerIds.length,
        roundIndex: game.stateV2.moveIndex,
        djName: game.djName,
        projectId: game.projectId,
        configId: game.configId,
        configName: game.configName,
        forumTopicId: game.forumTopicId,
        hostUserId: game.hostUserId,
        hostSnapshot: clone(game.hostSnapshot),
      },
      configuration: {
        resources: clone(game.resources),
        rules: clone(game.rules),
        journeyConfig: getJourneyConfig(game.rules, game.resources),
        achievements: getJourneyAchievements(game.rules),
        collectorTargets: [
          ...game.rules.cells.map((cell) => ({
            key: getJourneyCellKey(cell.kind, cell.id),
            id: cell.id,
            kind: cell.kind,
            mapLabel: getJourneyCellMapLabel(cell),
            rewardPool: clone(cell.rewardPool),
          })),
          { key: "empty", id: "empty", kind: "empty" as const, mapLabel: "·", rewardPool: null },
        ],
      },
      state: {
        board: Object.fromEntries(
          Object.entries(game.stateV2.map).map(([position, cell]) => [
            position,
            { ...clone(cell), mapLabel: getJourneyCellMapLabel(cell) },
          ]),
        ),
        players: game.stateV2.players.map((player) => this.player(player, game)),
        activePlayerIds,
        finishedPlayerIds: game.stateV2.players
          .filter((player) => player.status === "finished")
          .map((player) => player.id),
        visiblePlayerIds: game.stateV2.players
          .filter((player) => player.status !== "removed")
          .map((player) => player.id),
        resultPlayerIds: game.stateV2.players
          .filter((player) => player.status !== "removed")
          .sort((a, b) => a.nickname.localeCompare(b.nickname, "ru"))
          .map((player) => player.id),
      },
      achievements: {
        progressByPlayerId: Object.fromEntries(
          game.stateV2.players.map((player) => [player.id, this.engine.getAchievementProgress(game, player)]),
        ),
      },
      history: { byPlayerId: this.engine.getPlayerTimelines(game) },
      forumLog: clone(game.stateV2.forumLog),
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
      resources: clone(game.resources),
      roundsCount: game.stateV2.rounds.length,
      players: game.stateV2.players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        status: player.status,
        position: player.position,
        balanceEntries: entries(this.engine.getPlayerRewardSummary(game, player).balanceEntries, game.resources),
      })),
    };
  }
  private player(player: JourneyV2Player, game: JourneyV2Game): JourneyGameView["state"]["players"][number] {
    const rewards = this.engine.getPlayerRewardSummary(game, player);
    return {
      id: player.id,
      nickname: player.nickname,
      status: player.status,
      position: player.position,
      baseRewardEntries: entries(rewards.baseRewardEntries, game.resources),
      bonusRewardEntries: entries(rewards.bonusRewardEntries, game.resources),
      balanceEntries: entries(rewards.balanceEntries, game.resources),
      bonuses: clone(rewards.bonuses),
    };
  }
}
const clone = <T>(value: T): T => structuredClone(value);
const entries = (amounts: readonly ResourceAmount[], resources: JourneyV2Game["resources"]): ResourceAmount[] => {
  const byResourceId = new Map(amounts.map((amount) => [amount.resourceId, amount.amount]));
  return resources.map((resource) => ({ resourceId: resource.id, amount: byResourceId.get(resource.id) ?? 0 }));
};
