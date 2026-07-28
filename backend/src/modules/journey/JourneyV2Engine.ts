import type { ResourceAmount, ResourceHoldings, ResourceSnapshot } from "../rewards";
import { ResourceInventoryService, RewardResolver } from "../rewards";
import { JourneyRoundValidationError } from "./errors";
import { JourneyRewardCommentFormatter, type FormattedRewardApplication } from "./domain/JourneyRewardCommentFormatter";
import { renderJourneyCommentTemplate } from "./domain/commentTemplates";
import { JourneyCommentTemplateRotator } from "./domain/JourneyCommentTemplateRotator";
import { toJourneyMoveCommentTemplateKind } from "./domain/types";
import { buildJourneyRoundMarker, JOURNEY_GAME_STARTED_MARKER } from "./JourneyForumMarkers";
import {
  getJourneyAchievements,
  getJourneyBonusCells,
  getJourneyConfig,
  JOURNEY_ACHIEVEMENT_NAMES,
  JOURNEY_ACHIEVEMENT_STREAK_TARGETS,
  MOVE_TYPES,
  normalizeJourneyRules,
} from "./domain/config";
import type {
  JourneyAchievement,
  JourneyCommentReference,
  JourneyCommentTemplateKind,
  JourneyAchievementProgress,
  JourneyHistoryEntryView,
  JourneyMapCell,
  JourneyMoveInput,
  JourneyMoveType,
  JourneyPlayerStatus,
  JourneyRules,
  JourneyV2Game,
  JourneyV2Player,
  JourneyV2Round,
  JourneyV2Turn,
  RandomFn,
} from "./domain/types";

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
const randomInteger = (min: number, max: number, random: RandomFn) => Math.floor(random() * (max - min + 1)) + min;
const hasPositive = (rewards: readonly ResourceAmount[]) => rewards.some((reward) => reward.amount > 0);
const hasNegative = (rewards: readonly ResourceAmount[]) => rewards.some((reward) => reward.amount < 0);

export class JourneyV2Engine {
  constructor(
    private readonly rewardResolver: RewardResolver,
    private readonly inventory: ResourceInventoryService,
    private readonly rewardCommentFormatter: JourneyRewardCommentFormatter,
    private readonly commentTemplateRotator: JourneyCommentTemplateRotator,
  ) {}

  createGame(
    nicknames: string[],
    options: {
      randomFn?: RandomFn;
      rules?: JourneyRules;
      resources?: ResourceSnapshot[];
      djName?: string;
      projectId?: string;
      configId?: string;
      configName?: string;
      forumTopicId?: number;
    } = {},
  ): JourneyV2Game {
    const createdAt = now();
    const random = options.randomFn ?? Math.random;
    const rules = normalizeJourneyRules(options.rules);
    const resources = clone(options.resources ?? []);
    const initial = this.inventory.apply(
      {},
      this.rewardResolver.resolve(rules.initialRewardPool),
      rules.resourceLimits,
    ).holdings;
    const players = [...new Set(nicknames.map((name) => name.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, ["ru-RU", "en-US"], { sensitivity: "base" }))
      .map((nickname) => ({
        id: globalThis.crypto?.randomUUID?.() ?? `${nickname}-${Date.now()}-${Math.random()}`,
        nickname,
        status: "active" as const,
        removedAt: null,
        removedReason: null,
        position: 0,
        balance: clone(initial),
        achievementNames: [],
      }));
    return {
      storageFormat: "v2",
      createdAt,
      updatedAt: createdAt,
      djName: options.djName?.trim() ?? "",
      projectId: options.projectId?.trim() ?? "",
      configId: options.configId ?? "",
      configName: options.configName ?? "",
      forumTopicId: options.forumTopicId ?? null,
      resources,
      rules,
      stateV2: {
        moveIndex: 0,
        status: "in_progress",
        map: this.createMap(rules, players.length, random),
        players,
        rounds: [],
        commentState: this.commentTemplateRotator.createState(random),
        forumLog: [
          JOURNEY_GAME_STARTED_MARKER,
          ...players.map((player) => `${player.nickname} — [${this.formatHoldings(player.balance, resources)}]`),
        ],
      },
    };
  }

  makeRound(
    game: JourneyV2Game,
    moves: JourneyMoveInput[],
    skippedPlayerIds: string[] = [],
    random: RandomFn = Math.random,
  ): JourneyV2Game {
    const next = clone(game);
    const active = next.stateV2.players.filter((player) => player.status === "active");
    if (!active.length) return this.finishGame(next);
    this.validateRound(active, moves, skippedPlayerIds, next.rules, next.resources);
    next.stateV2.moveIndex += 1;
    const turns = new Map<string, JourneyV2Turn>();
    moves.forEach(({ playerId, dice }) => {
      const player = this.findPlayer(next, playerId);
      if (player) turns.set(playerId, this.buildMove(player, dice, next));
    });
    this.applyJackpots(next, turns, random);
    const orderedTurns = active.map(
      (player) => turns.get(player.id) ?? { kind: "skip" as const, playerId: player.id, commentRefs: [] },
    );
    orderedTurns.forEach((turn) => {
      if (turn.kind !== "move") return;
      const player = this.findPlayer(next, turn.playerId)!;
      player.position = turn.to;
      player.balance = this.inventory.apply(player.balance, turn.resolvedRewards, next.rules.resourceLimits).holdings;
      player.status = this.playerStatus(player, next);
    });
    orderedTurns.forEach((turn) => {
      if (turn.kind !== "move" || turn.moveType === MOVE_TYPES.JACKPOT) return;
      const player = this.findPlayer(next, turn.playerId)!;
      this.eligibleAchievements(next, player, turn).forEach((achievement) =>
        this.grantAchievement(player, turn, achievement, next),
      );
    });
    const round: JourneyV2Round = { index: next.stateV2.moveIndex, occurredAt: now(), turns: orderedTurns };
    this.assignCommentReferences(next, round, random);
    next.stateV2.rounds.push(round);
    next.stateV2.forumLog.push(...this.buildComments(next, round));
    next.updatedAt = round.occurredAt;
    return next.stateV2.players.some((player) => player.status === "active") ? next : this.finishGame(next);
  }

  removePlayer(game: JourneyV2Game, playerId: string): JourneyV2Game {
    const next = clone(game);
    const player = this.findPlayer(next, playerId);
    if (!player || player.status === "removed") return next;
    player.status = "removed";
    player.removedAt = now();
    player.removedReason = "manual";
    next.updatedAt = player.removedAt;
    next.stateV2.forumLog.push(`Игрок ${player.nickname} удалён из текущей партии.`);
    return next.stateV2.players.some((candidate) => candidate.status === "active") ? next : this.finishGame(next);
  }

  getAchievementProgress(game: JourneyV2Game, player: JourneyV2Player): JourneyAchievementProgress {
    const moves = game.stateV2.rounds.flatMap((round) =>
      round.turns.filter(
        (turn): turn is Extract<JourneyV2Turn, { kind: "move" }> => turn.kind === "move" && turn.playerId === player.id,
      ),
    );
    const achievements = getJourneyAchievements(game.rules);
    const targets = game.rules.cells.map((cell) => cell.id).concat("empty");
    const visited = new Set(
      moves
        .map((move) =>
          move.moveType === MOVE_TYPES.EMPTY || move.moveType === MOVE_TYPES.EMPTY_JACKPOT
            ? "empty"
            : game.stateV2.map[move.to]?.id,
        )
        .filter(Boolean),
    );
    const streak = (
      predicate: (move: Extract<JourneyV2Turn, { kind: "move" }>) => boolean,
      name: string,
      target: number,
    ) => {
      let best = 0;
      let current = 0;
      moves.forEach((move) => {
        current = predicate(move) ? current + 1 : 0;
        best = Math.max(best, current);
      });
      let trailing = 0;
      for (const move of [...moves].reverse()) {
        if (!predicate(move)) break;
        trailing += 1;
      }
      return { achieved: player.achievementNames.includes(name), current: trailing, best, target };
    };
    return {
      collector: {
        achieved: player.achievementNames.includes(achievements.COLLECTOR.name),
        obtainedCellIds: targets.filter((id) => visited.has(id)),
        missingCellIds: targets.filter((id) => !visited.has(id)),
      },
      unlucky: streak(
        (move) => hasNegative(move.resolvedRewards),
        achievements.UNLUCKY.name,
        JOURNEY_ACHIEVEMENT_STREAK_TARGETS.unlucky,
      ),
      careful: streak(
        (move) =>
          move.to !== getJourneyConfig(game.rules, game.resources).finishPosition &&
          move.moveType !== MOVE_TYPES.JACKPOT &&
          move.resolvedRewards.length === 0,
        achievements.CAREFUL.name,
        JOURNEY_ACHIEVEMENT_STREAK_TARGETS.careful,
      ),
      lucky: streak(
        (move) => hasPositive(move.resolvedRewards),
        achievements.LUCKY.name,
        JOURNEY_ACHIEVEMENT_STREAK_TARGETS.lucky,
      ),
    };
  }

  getPlayerTimelines(game: JourneyV2Game): Record<string, JourneyHistoryEntryView[]> {
    return Object.fromEntries(
      game.stateV2.players.map((player) => [
        player.id,
        game.stateV2.rounds.flatMap((round) =>
          round.turns
            .filter((turn) => turn.playerId === player.id)
            .map(
              (turn): JourneyHistoryEntryView =>
                turn.kind === "skip"
                  ? {
                      createdAt: round.occurredAt,
                      roundIndex: round.index,
                      skipped: true,
                      previousPosition: null,
                      currentPosition: null,
                      requestedRewards: [],
                      resolvedRewards: [],
                      appliedRewards: [],
                      balanceAfterRound: null,
                      cell: null,
                      achievementsAwarded: [],
                    }
                  : {
                      createdAt: round.occurredAt,
                      roundIndex: round.index,
                      skipped: false,
                      previousPosition: turn.from,
                      currentPosition: turn.to,
                      requestedRewards: clone(turn.requestedRewards),
                      resolvedRewards: clone(turn.resolvedRewards),
                      appliedRewards: clone(turn.appliedRewards),
                      balanceAfterRound: null,
                      cell: clone(game.stateV2.map[turn.to] ?? null),
                      achievementsAwarded: turn.achievementEffects
                        .map((effect) => this.achievement(game, effect.name))
                        .filter((value): value is JourneyAchievement => Boolean(value)),
                    },
            ),
        ),
      ]),
    );
  }

  private createMap(rules: JourneyRules, players: number, random: RandomFn): Record<number, JourneyMapCell> {
    const available = Array.from({ length: rules.mapSize }, (_, index) => index + 1);
    const map: Record<number, JourneyMapCell> = {};
    getJourneyBonusCells(rules, players).forEach(({ cell, amount }) => {
      for (let i = 0; i < amount; i += 1) {
        const [position] = available.splice(randomInteger(0, available.length - 1, random), 1);
        map[position] = clone(cell);
      }
    });
    return map;
  }
  private buildMove(
    player: JourneyV2Player,
    dice: number,
    game: JourneyV2Game,
  ): Extract<JourneyV2Turn, { kind: "move" }> {
    const to = Math.min(player.position + dice, getJourneyConfig(game.rules, game.resources).finishPosition);
    const cell = game.stateV2.map[to];
    const resolved = cell && !cell.isJackpot ? this.rewardResolver.resolve(cell.rewardPool) : [];
    const application = this.inventory.apply(player.balance, resolved, game.rules.resourceLimits);
    return {
      kind: "move",
      playerId: player.id,
      dice,
      from: player.position,
      to,
      moveType:
        to === getJourneyConfig(game.rules, game.resources).finishPosition
          ? MOVE_TYPES.FINISH
          : this.moveType(
              resolved,
              application.rewards.map((entry) => entry.applied),
            ),
      requestedRewards: clone(resolved),
      resolvedRewards: clone(resolved),
      appliedRewards: application.rewards.map((entry) => entry.applied),
      achievementEffects: [],
      commentRefs: [],
    };
  }
  private applyJackpots(game: JourneyV2Game, turns: Map<string, JourneyV2Turn>, random: RandomFn): void {
    Object.entries(game.stateV2.map)
      .filter(([, cell]) => cell.isJackpot)
      .forEach(([position, cell]) => {
        const landed = [...turns.values()].filter(
          (turn): turn is Extract<JourneyV2Turn, { kind: "move" }> =>
            turn.kind === "move" && turn.to === Number(position),
        );
        if (!landed.length) return;
        if (!cell.winner) {
          const eligible = landed.filter((turn) => !this.hasWonJackpot(game, turn.playerId));
          if (eligible.length) {
            const winner = eligible[randomInteger(0, eligible.length - 1, random)];
            const player = this.findPlayer(game, winner.playerId)!;
            const resolved = this.rewardResolver.resolve(cell.rewardPool);
            const applied = this.inventory
              .apply(player.balance, resolved, game.rules.resourceLimits)
              .rewards.map((entry) => entry.applied);
            cell.winner = { nickname: player.nickname };
            Object.assign(winner, {
              moveType: MOVE_TYPES.JACKPOT,
              requestedRewards: clone(resolved),
              resolvedRewards: clone(resolved),
              appliedRewards: applied,
            });
          }
        }
        const winnerId = game.stateV2.players.find((player) => player.nickname === cell.winner?.nickname)?.id;
        landed
          .filter((turn) => turn.playerId !== winnerId)
          .forEach((turn) => {
            turn.moveType = MOVE_TYPES.EMPTY_JACKPOT;
          });
      });
  }
  private eligibleAchievements(
    game: JourneyV2Game,
    player: JourneyV2Player,
    turn: Extract<JourneyV2Turn, { kind: "move" }>,
  ): JourneyAchievement[] {
    const preview = clone(game);
    preview.stateV2.rounds.push({ index: game.stateV2.moveIndex, occurredAt: game.updatedAt, turns: [turn] });
    const progress = this.getAchievementProgress(preview, player);
    const achievements = getJourneyAchievements(game.rules);
    return [
      !progress.unlucky.achieved && progress.unlucky.current >= progress.unlucky.target ? achievements.UNLUCKY : null,
      !progress.careful.achieved && progress.careful.current >= progress.careful.target ? achievements.CAREFUL : null,
      !progress.collector.achieved && !progress.collector.missingCellIds.length ? achievements.COLLECTOR : null,
      !progress.lucky.achieved && progress.lucky.current >= progress.lucky.target ? achievements.LUCKY : null,
    ].filter((value): value is JourneyAchievement => Boolean(value));
  }
  private grantAchievement(
    player: JourneyV2Player,
    turn: Extract<JourneyV2Turn, { kind: "move" }>,
    achievement: JourneyAchievement,
    game: JourneyV2Game,
  ): void {
    if (player.achievementNames.includes(achievement.name)) return;
    const resolved = this.rewardResolver.resolve(achievement.rewardPool);
    const application = this.inventory.apply(player.balance, resolved, game.rules.resourceLimits);
    player.achievementNames.push(achievement.name);
    player.balance = application.holdings;
    turn.achievementEffects.push({
      name: achievement.name,
      requestedRewards: clone(resolved),
      resolvedRewards: clone(resolved),
      appliedRewards: application.rewards.map((entry) => entry.applied),
      commentRefs: [],
    });
  }
  private moveType(resolved: ResourceAmount[], applied: ResourceAmount[]): JourneyMoveType {
    if (!resolved.length) return MOVE_TYPES.EMPTY;
    if (hasPositive(resolved))
      return applied.every((reward) => reward.amount === 0)
        ? MOVE_TYPES.AT_MAX
        : applied.some((reward, index) => reward.amount !== resolved[index]?.amount)
          ? MOVE_TYPES.TO_MAX
          : MOVE_TYPES.INCREASE;
    return applied.every((reward) => reward.amount === 0)
      ? MOVE_TYPES.AT_ZERO
      : applied.some((reward, index) => reward.amount !== resolved[index]?.amount)
        ? MOVE_TYPES.TO_ZERO
        : MOVE_TYPES.DECREASE;
  }
  private validateRound(
    players: JourneyV2Player[],
    moves: JourneyMoveInput[],
    skipped: string[],
    rules: JourneyRules,
    resources: ResourceSnapshot[],
  ): void {
    const config = getJourneyConfig(rules, resources);
    const active = new Set(players.map((player) => player.id));
    const seen = new Set<string>();
    moves.forEach((move) => {
      if (
        !active.has(move.playerId) ||
        seen.has(move.playerId) ||
        !Number.isInteger(move.dice) ||
        move.dice < config.minDice ||
        move.dice > config.maxDice
      )
        throw new JourneyRoundValidationError("Invalid Journey round input");
      seen.add(move.playerId);
    });
    skipped.forEach((id) => {
      if (!active.has(id) || seen.has(id)) throw new JourneyRoundValidationError("Invalid Journey round input");
      seen.add(id);
    });
    if (seen.size !== players.length) throw new JourneyRoundValidationError("Round input is incomplete");
  }
  private findPlayer(game: JourneyV2Game, id: string) {
    return game.stateV2.players.find((player) => player.id === id);
  }
  private playerStatus(player: JourneyV2Player, game: JourneyV2Game): JourneyPlayerStatus {
    return player.status === "removed"
      ? "removed"
      : player.position === getJourneyConfig(game.rules, game.resources).finishPosition
        ? "finished"
        : "active";
  }
  private hasWonJackpot(game: JourneyV2Game, playerId: string): boolean {
    const player = this.findPlayer(game, playerId);
    return Boolean(
      player &&
      Object.values(game.stateV2.map).some((cell) => cell.isJackpot && cell.winner?.nickname === player.nickname),
    );
  }
  private achievement(game: JourneyV2Game, name: string) {
    return Object.values(getJourneyAchievements(game.rules)).find((achievement) => achievement.name === name) ?? null;
  }
  private holdingsEntries(holdings: ResourceHoldings, resources: ResourceSnapshot[]): ResourceAmount[] {
    return resources.map((resource) => ({ resourceId: resource.id, amount: holdings[resource.id] ?? 0 }));
  }
  private formatHoldings(holdings: ResourceHoldings, resources: ResourceSnapshot[]) {
    return this.holdingsEntries(holdings, resources)
      .map(
        (entry) =>
          `${entry.amount} ${resources.find((resource) => resource.id === entry.resourceId)?.label ?? entry.resourceId}`,
      )
      .join(", ");
  }
  private buildComments(game: JourneyV2Game, round: JourneyV2Round): string[] {
    return [
      "",
      buildJourneyRoundMarker(round.index),
      ...round.turns.flatMap((turn) => {
        const player = this.findPlayer(game, turn.playerId)!;
        if (turn.kind === "skip") return this.renderRewardComments(game, turn.commentRefs, player.nickname, null);
        return [...this.buildAchievementComments(game, player, turn), ...this.buildMoveComments(game, player, turn)];
      }),
    ];
  }

  private buildMoveComments(
    game: JourneyV2Game,
    player: JourneyV2Player,
    turn: Extract<JourneyV2Turn, { kind: "move" }>,
  ): string[] {
    return this.renderRewardComments(
      game,
      turn.commentRefs,
      player.nickname,
      this.rewardCommentFormatter.format(game.resources, turn.resolvedRewards, turn.appliedRewards),
    );
  }

  private buildAchievementComments(
    game: JourneyV2Game,
    player: JourneyV2Player,
    turn: Extract<JourneyV2Turn, { kind: "move" }>,
  ): string[] {
    return turn.achievementEffects.flatMap((effect) => {
      const achievement = this.achievement(game, effect.name) ?? { name: effect.name };
      const formatted = this.rewardCommentFormatter.format(
        game.resources,
        effect.resolvedRewards,
        effect.appliedRewards,
      );
      return this.renderRewardComments(game, effect.commentRefs, player.nickname, formatted, achievement);
    });
  }

  private assignCommentReferences(game: JourneyV2Game, round: JourneyV2Round, random: RandomFn): void {
    const state = this.getCommentState(game, random);
    round.turns.forEach((turn) => {
      if (turn.kind === "skip") {
        turn.commentRefs = [this.commentTemplateRotator.takeNext(state, "skip", random)];
        return;
      }

      turn.achievementEffects.forEach((effect) => {
        const formatted = this.rewardCommentFormatter.format(
          game.resources,
          effect.resolvedRewards,
          effect.appliedRewards,
        );
        effect.commentRefs = [
          this.commentTemplateRotator.takeNext(state, this.achievementCommentKind(effect.name, formatted), random),
          ...this.limitCommentReferences(state, formatted, random),
        ];
      });

      const formatted = this.rewardCommentFormatter.format(game.resources, turn.resolvedRewards, turn.appliedRewards);
      turn.commentRefs = [
        this.commentTemplateRotator.takeNext(state, this.moveCommentKind(turn), random),
        ...this.limitCommentReferences(state, formatted, random),
      ];
    });
  }

  private getCommentState(game: JourneyV2Game, random: RandomFn) {
    game.stateV2.commentState ??= this.commentTemplateRotator.createState(random);
    return game.stateV2.commentState;
  }

  private moveCommentKind(turn: Extract<JourneyV2Turn, { kind: "move" }>): JourneyCommentTemplateKind {
    if (turn.moveType === MOVE_TYPES.JACKPOT && !turn.resolvedRewards.length) return "jackpot:empty_reward";
    if (!turn.resolvedRewards.length && turn.moveType !== MOVE_TYPES.EMPTY_JACKPOT && turn.moveType !== MOVE_TYPES.FINISH) {
      return "move:moveWithoutBonus";
    }
    if (turn.moveType === MOVE_TYPES.ACHIEVEMENT) return toJourneyMoveCommentTemplateKind(MOVE_TYPES.EMPTY);
    return toJourneyMoveCommentTemplateKind(turn.moveType);
  }

  private achievementCommentKind(name: string, formatted: FormattedRewardApplication): JourneyCommentTemplateKind {
    if (!this.toRewardTemplateLabel(formatted)) return "achievement:empty_reward";
    if (name === JOURNEY_ACHIEVEMENT_NAMES.UNLUCKY) return "achievement:unlucky";
    if (name === JOURNEY_ACHIEVEMENT_NAMES.CAREFUL) return "achievement:careful";
    if (name === JOURNEY_ACHIEVEMENT_NAMES.COLLECTOR) return "achievement:collector";
    return "achievement:lucky";
  }

  private limitCommentReferences(
    state: NonNullable<JourneyV2Game["stateV2"]["commentState"]>,
    formatted: FormattedRewardApplication,
    random: RandomFn,
  ): JourneyCommentReference[] {
    return [
      ...(formatted.unappliedGain ? [this.commentTemplateRotator.takeNext(state, "limit:gain", random)] : []),
      ...(formatted.unappliedLoss ? [this.commentTemplateRotator.takeNext(state, "limit:loss", random)] : []),
    ];
  }

  private renderRewardComments(
    game: JourneyV2Game,
    references: JourneyCommentReference[],
    nickname: string,
    formatted: FormattedRewardApplication | null,
    achievement?: Pick<JourneyAchievement, "name" | "title" | "description">,
  ): string[] {
    const state = this.getCommentState(game, Math.random);
    return references.map((reference) => {
      const template = this.commentTemplateRotator.getTemplate(state, reference);
      const limitLabel = reference.kind === "limit:gain"
        ? formatted?.unappliedGain
        : reference.kind === "limit:loss"
          ? formatted?.unappliedLoss
          : null;
      return renderJourneyCommentTemplate(template.text, {
        nickname,
        rewardLabel: limitLabel ?? (formatted ? this.toRewardTemplateLabel(formatted) : null) ?? "",
        requestedRewardLabel: (formatted ? this.toResolvedRewardTemplateLabel(formatted) : null) ?? "",
        context: achievement ? " за достижение" : "",
        achievement: achievement?.title ?? achievement?.name ?? "",
        description: achievement?.description ?? "",
      });
    });
  }

  private toRewardTemplateLabel(formatted: FormattedRewardApplication): string | null {
    if (formatted.gained && formatted.lost) return `${formatted.gained}, но теряет ${formatted.lost}`;
    return formatted.gained ?? formatted.lost;
  }

  private toResolvedRewardTemplateLabel(formatted: FormattedRewardApplication): string | null {
    if (formatted.resolvedGain && formatted.resolvedLoss) {
      return `${formatted.resolvedGain}, но теряет ${formatted.resolvedLoss}`;
    }
    return formatted.resolvedGain ?? formatted.resolvedLoss;
  }
  private finishGame(game: JourneyV2Game): JourneyV2Game {
    if (game.stateV2.status === "finished") return game;
    game.stateV2.status = "finished";
    game.stateV2.forumLog.push(
      "",
      "=== Итоги ===",
      ...game.stateV2.players
        .filter((player) => player.status !== "removed")
        .map((player) => `${player.nickname} — [${this.formatHoldings(player.balance, game.resources)}]`),
    );
    game.updatedAt = now();
    return game;
  }
}
