import type { CurrencySnapshot as ConfigCurrency } from "../../common/currency";
import { JourneyRoundValidationError } from "./errors";
import { getJourneyCollectorTargets } from "./domain/achievementProgress";
import { buildJourneyComment } from "./domain/commentTemplates";
import { getJourneyAchievements, getJourneyBonusCells, getJourneyConfig, MOVE_TYPES, normalizeJourneyRules } from "./domain/config";
import { applyJourneyRewardsToBalance, balanceToJourneyCurrencyValues, createJourneyBalance, hasNegativeJourneyRewards, hasPositiveJourneyRewards } from "./domain/currency";
import type {
  JourneyAchievement,
  JourneyAchievementProgress,
  JourneyCurrencyValue,
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function now(): string {
  return new Date().toISOString();
}

function randomInteger(min: number, max: number, randomFn: RandomFn): number {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

function generatePlayerId(nickname: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${nickname}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Rules engine for the compact V2 Journey state. It never materializes a V1 game. */
export class JourneyV2Engine {
  createGame(
    nicknames: string[],
    options: {
      randomFn?: RandomFn;
      rules?: JourneyRules;
      currencies?: ConfigCurrency[];
      djName?: string;
      projectId?: string;
      configId?: string;
      configName?: string;
    } = {},
  ): JourneyV2Game {
    const createdAt = now();
    const currencies = options.currencies?.length ? clone(options.currencies) : [{ id: "default", label: "фишек" }];
    const rules = normalizeJourneyRules(options.rules);
    const initialBalance = createJourneyBalance(currencies, getJourneyConfig(rules, currencies).initialRewards);

    return {
      storageFormat: "v2",
      createdAt,
      updatedAt: createdAt,
      djName: options.djName?.trim() ?? "",
      projectId: options.projectId?.trim() ?? "",
      configId: options.configId ?? "oldbk2",
      configName: options.configName ?? options.configId ?? "oldbk2",
      currencies,
      rules,
      stateV2: {
        moveIndex: 0,
        status: "in_progress",
        map: this.createMap(rules, options.randomFn ?? Math.random),
        players: [...new Set(nicknames.map((nickname) => nickname.trim()).filter(Boolean))].map((nickname) => ({
          id: generatePlayerId(nickname),
          nickname,
          status: "active",
          removedAt: null,
          removedReason: null,
          position: 0,
          balance: clone(initialBalance),
          achievementNames: [],
        })),
        rounds: [],
        forumLog: [],
      },
    };
  }

  makeRound(game: JourneyV2Game, inputMoves: JourneyMoveInput[], skippedPlayerIds: string[] = [], randomFn: RandomFn = Math.random): JourneyV2Game {
    const nextGame = clone(game);
    const state = nextGame.stateV2;
    const activePlayers = state.players.filter((player) => player.status === "active");

    if (!activePlayers.length) {
      return this.finishGame(nextGame);
    }

    this.validateRound(activePlayers, inputMoves, skippedPlayerIds, nextGame.rules, nextGame.currencies);
    state.moveIndex += 1;
    const occurredAt = now();
    const turnsByPlayerId = new Map<string, JourneyV2Turn>();

    inputMoves.forEach(({ playerId, dice }) => {
      const player = this.getPlayer(state.players, playerId);
      if (!player) {
        return;
      }

      turnsByPlayerId.set(playerId, this.buildMoveTurn(player, dice, nextGame));
    });

    this.applyJackpots(nextGame, turnsByPlayerId, randomFn);
    const turns = activePlayers.map((player) => turnsByPlayerId.get(player.id) ?? { kind: "skip" as const, playerId: player.id });

    turns.forEach((turn) => {
      if (turn.kind !== "move") {
        return;
      }

      const player = this.getPlayer(state.players, turn.playerId);
      if (!player) {
        return;
      }

      player.position = turn.to;
      player.balance = this.applyRewards(player.balance, turn.appliedRewards, nextGame).nextBalance;
      player.status = this.getPlayerStatus(player, nextGame);

      if (turn.moveType === MOVE_TYPES.JACKPOT) {
        this.grantAchievement(player, turn, getJourneyAchievements(nextGame.rules).JACKPOT, nextGame);
      }
    });

    turns.forEach((turn) => {
      if (turn.kind !== "move" || turn.moveType === MOVE_TYPES.JACKPOT) {
        return;
      }

      const player = this.getPlayer(state.players, turn.playerId);
      if (!player) {
        return;
      }

      this.getEligibleAchievements(game, player, turn).forEach((achievement) => this.grantAchievement(player, turn, achievement, nextGame));
    });

    const round: JourneyV2Round = { index: state.moveIndex, occurredAt, turns };
    state.rounds.push(round);
    state.forumLog.push(...this.buildRoundComments(nextGame, round, randomFn));
    nextGame.updatedAt = occurredAt;

    return state.players.some((player) => player.status === "active") ? nextGame : this.finishGame(nextGame);
  }

  removePlayer(game: JourneyV2Game, playerId: string): JourneyV2Game {
    const nextGame = clone(game);
    const player = this.getPlayer(nextGame.stateV2.players, playerId);

    if (!player || player.status === "removed") {
      return nextGame;
    }

    player.status = "removed";
    player.removedAt = now();
    player.removedReason = "manual";
    nextGame.stateV2.forumLog.push(`Игрок ${player.nickname} удалён из текущей партии.`);
    nextGame.updatedAt = player.removedAt;

    return nextGame.stateV2.players.some((candidate) => candidate.status === "active") ? nextGame : this.finishGame(nextGame);
  }

  getAchievementProgress(game: JourneyV2Game, player: JourneyV2Player): JourneyAchievementProgress {
    const moves = game.stateV2.rounds.flatMap((round) =>
      round.turns.filter((turn): turn is Extract<JourneyV2Turn, { kind: "move" }> => turn.kind === "move" && turn.playerId === player.id),
    );
    const achievements = getJourneyAchievements(game.rules);
    const finishPosition = getJourneyConfig(game.rules, game.currencies).finishPosition;
    const collectorTargets = getJourneyCollectorTargets(game.rules);
    const visitedTargetIds = new Set(
      moves.flatMap((move) => {
        if (move.moveType === MOVE_TYPES.EMPTY || move.moveType === MOVE_TYPES.EMPTY_JACKPOT) {
          return ["empty"];
        }
        const cell = game.stateV2.map[move.to];
        return cell && !cell.isJackpot ? [cell.id] : [];
      }),
    );
    const isCareful = (move: Extract<JourneyV2Turn, { kind: "move" }>) => {
      const cell = game.stateV2.map[move.to];
      return move.to !== finishPosition && move.moveType !== MOVE_TYPES.JACKPOT && (!cell || cell.isJackpot || !cell.rewards.length);
    };
    const isNegative = (move: Extract<JourneyV2Turn, { kind: "move" }>) => hasNegativeJourneyRewards(game.stateV2.map[move.to]?.rewards ?? []);
    const isPositive = (move: Extract<JourneyV2Turn, { kind: "move" }>) => hasPositiveJourneyRewards(game.stateV2.map[move.to]?.rewards ?? []);

    return {
      collector: {
        achieved: player.achievementNames.includes(achievements.COLLECTOR.name),
        obtainedCellIds: collectorTargets.map((target) => target.id).filter((id) => visitedTargetIds.has(id)),
        missingCellIds: collectorTargets.map((target) => target.id).filter((id) => !visitedTargetIds.has(id)),
      },
      unlucky: this.buildStreakProgress(player, moves, isNegative, achievements.UNLUCKY.name, 3),
      careful: this.buildStreakProgress(player, moves, isCareful, achievements.CAREFUL.name, 4),
      lucky: this.buildStreakProgress(player, moves, isPositive, achievements.LUCKY.name, 5),
    };
  }

  getPlayerTimelines(game: JourneyV2Game): Record<string, JourneyHistoryEntryView[]> {
    const balances = Object.fromEntries(
      game.stateV2.players.map((player) => [player.id, createJourneyBalance(game.currencies, getJourneyConfig(game.rules, game.currencies).initialRewards)]),
    );
    const result = Object.fromEntries(game.stateV2.players.map((player) => [player.id, [] as JourneyHistoryEntryView[]]));

    game.stateV2.rounds.forEach((round) => round.turns.forEach((turn) => {
      const player = this.getPlayer(game.stateV2.players, turn.playerId);
      if (!player) {
        return;
      }
      const balanceBefore = balances[player.id];
      if (turn.kind === "skip") {
        result[player.id].push({ createdAt: round.occurredAt, roundIndex: round.index, skipped: true, previousPosition: null, currentPosition: null, appliedRewards: [], balanceAfterRound: balanceToJourneyCurrencyValues(balanceBefore, game.currencies), cell: null, achievementsAwarded: [] });
        return;
      }
      const afterMove = this.applyRewards(balanceBefore, turn.appliedRewards, game).nextBalance;
      const afterRound = turn.achievementEffects.reduce((balance, effect) => this.applyRewards(balance, effect.appliedRewards, game).nextBalance, afterMove);
      balances[player.id] = afterRound;
      result[player.id].push({
        createdAt: round.occurredAt,
        roundIndex: round.index,
        skipped: false,
        previousPosition: turn.from,
        currentPosition: turn.to,
        appliedRewards: clone(turn.appliedRewards),
        balanceAfterRound: balanceToJourneyCurrencyValues(afterRound, game.currencies),
        cell: clone(game.stateV2.map[turn.to] ?? null),
        achievementsAwarded: turn.achievementEffects.map((effect) => clone(this.getAchievement(game, effect.name))).filter((achievement): achievement is JourneyAchievement => Boolean(achievement)),
      });
    }));

    return result;
  }

  private createMap(rules: JourneyRules, randomFn: RandomFn): Record<number, JourneyMapCell> {
    const availablePositions = Array.from({ length: getJourneyConfig(rules).mapSize }, (_, index) => index + 1);
    const map: Record<number, JourneyMapCell> = {};
    getJourneyBonusCells(rules).forEach(({ cell, amount }) => {
      for (let index = 0; index < amount; index += 1) {
        const [position] = availablePositions.splice(randomInteger(0, availablePositions.length - 1, randomFn), 1);
        map[position] = clone(cell);
      }
    });
    return map;
  }

  private buildMoveTurn(player: JourneyV2Player, dice: number, game: JourneyV2Game): Extract<JourneyV2Turn, { kind: "move" }> {
    const finishPosition = getJourneyConfig(game.rules, game.currencies).finishPosition;
    const to = Math.min(player.position + dice, finishPosition);
    const cell = game.stateV2.map[to] ?? null;
    const requestedRewards = cell && !cell.isJackpot ? cell.rewards : [];
    const application = this.applyRewards(player.balance, requestedRewards, game);

    return {
      kind: "move", playerId: player.id, dice, from: player.position, to,
      moveType: to === finishPosition ? MOVE_TYPES.FINISH : this.resolveMoveType(requestedRewards, application),
      appliedRewards: application.appliedRewards,
      achievementEffects: [],
    };
  }

  private applyJackpots(game: JourneyV2Game, turnsByPlayerId: Map<string, JourneyV2Turn>, randomFn: RandomFn) {
    Object.entries(game.stateV2.map).filter(([, cell]) => cell.isJackpot).forEach(([position, cell]) => {
      const turns = Array.from(turnsByPlayerId.values()).filter((turn): turn is Extract<JourneyV2Turn, { kind: "move" }> => turn.kind === "move" && turn.to === Number(position));
      if (!turns.length) return;
      if (!cell.winner) {
        const eligible = turns.filter((turn) => !this.getPlayer(game.stateV2.players, turn.playerId)?.achievementNames.includes(getJourneyAchievements(game.rules).JACKPOT.name));
        if (eligible.length) {
          const winner = eligible[randomInteger(0, eligible.length - 1, randomFn)];
          const player = this.getPlayer(game.stateV2.players, winner.playerId);
          if (player) {
            cell.winner = { nickname: player.nickname };
            winner.moveType = MOVE_TYPES.JACKPOT;
          }
        }
      }
      const winnerId = game.stateV2.players.find((player) => player.nickname === cell.winner?.nickname)?.id;
      turns.filter((turn) => turn.playerId !== winnerId).forEach((turn) => { turn.moveType = MOVE_TYPES.EMPTY_JACKPOT; });
    });
  }

  private getEligibleAchievements(gameBeforeRound: JourneyV2Game, player: JourneyV2Player, turn: Extract<JourneyV2Turn, { kind: "move" }>): JourneyAchievement[] {
    const preview = clone(gameBeforeRound);
    preview.stateV2.rounds.push({ index: preview.stateV2.moveIndex + 1, occurredAt: preview.updatedAt, turns: [turn] });
    const progress = this.getAchievementProgress(preview, player);
    const achievements = getJourneyAchievements(gameBeforeRound.rules);
    return [
      !progress.unlucky.achieved && progress.unlucky.current >= progress.unlucky.target ? achievements.UNLUCKY : null,
      !progress.careful.achieved && progress.careful.current >= progress.careful.target ? achievements.CAREFUL : null,
      !progress.collector.achieved && progress.collector.missingCellIds.length === 0 ? achievements.COLLECTOR : null,
      !progress.lucky.achieved && progress.lucky.current >= progress.lucky.target ? achievements.LUCKY : null,
    ].filter((achievement): achievement is JourneyAchievement => Boolean(achievement));
  }

  private grantAchievement(player: JourneyV2Player, turn: Extract<JourneyV2Turn, { kind: "move" }>, achievement: JourneyAchievement, game: JourneyV2Game) {
    if (player.achievementNames.includes(achievement.name)) return;
    player.achievementNames.push(achievement.name);
    const application = this.applyRewards(player.balance, achievement.rewards, game);
    player.balance = application.nextBalance;
    turn.achievementEffects.push({ name: achievement.name, appliedRewards: application.appliedRewards });
  }

  private resolveMoveType(requestedRewards: JourneyCurrencyValue[], application: ReturnType<typeof applyJourneyRewardsToBalance>): JourneyMoveType {
    if (!requestedRewards.length) return MOVE_TYPES.EMPTY;
    if (hasPositiveJourneyRewards(requestedRewards)) {
      if (application.appliedRewards.every((reward) => reward.value === 0)) return MOVE_TYPES.AT_MAX;
      return application.hasAnyCappedPositiveReward || application.hasAnyBlockedPositiveReward ? MOVE_TYPES.TO_MAX : MOVE_TYPES.INCREASE;
    }
    if (application.appliedRewards.every((reward) => reward.value === 0)) return MOVE_TYPES.AT_ZERO;
    return application.hasAnyFlooredNegativeReward || application.hasAnyBlockedNegativeReward ? MOVE_TYPES.TO_ZERO : MOVE_TYPES.DECREASE;
  }

  private applyRewards(balance: Record<string, number>, rewards: JourneyCurrencyValue[], game: JourneyV2Game) {
    return applyJourneyRewardsToBalance({ balance, rewards, currencies: game.currencies, maxPrizes: getJourneyConfig(game.rules, game.currencies).maxPrizes });
  }

  private buildStreakProgress(player: JourneyV2Player, moves: Extract<JourneyV2Turn, { kind: "move" }>[], predicate: (move: Extract<JourneyV2Turn, { kind: "move" }>) => boolean, achievementName: string, target: number) {
    let best = 0; let current = 0;
    moves.forEach((move) => { current = predicate(move) ? current + 1 : 0; best = Math.max(best, current); });
    current = 0;
    [...moves].reverse().some((move) => { if (!predicate(move)) return true; current += 1; return false; });
    return { achieved: player.achievementNames.includes(achievementName), current, best, target };
  }

  private validateRound(players: JourneyV2Player[], moves: JourneyMoveInput[], skippedIds: string[], rules: JourneyRules, currencies: ConfigCurrency[]) {
    const config = getJourneyConfig(rules, currencies);
    const activeIds = new Set(players.map((player) => player.id));
    const moveIds = new Set<string>(); const skipIds = new Set<string>();
    moves.forEach(({ playerId, dice }) => {
      if (!activeIds.has(playerId)) throw new JourneyRoundValidationError(`Player '${playerId}' is not active in the current round`);
      if (!Number.isInteger(dice) || dice < config.minDice || dice > config.maxDice) throw new JourneyRoundValidationError(`Dice value for player '${playerId}' must be between ${config.minDice} and ${config.maxDice}`);
      if (moveIds.has(playerId)) throw new JourneyRoundValidationError(`Player '${playerId}' has more than one submitted move`);
      moveIds.add(playerId);
    });
    skippedIds.forEach((playerId) => {
      if (!activeIds.has(playerId)) throw new JourneyRoundValidationError(`Player '${playerId}' is not active in the current round`);
      if (skipIds.has(playerId) || moveIds.has(playerId)) throw new JourneyRoundValidationError(`Player '${playerId}' has conflicting round input`);
      skipIds.add(playerId);
    });
    if (players.some((player) => !moveIds.has(player.id) && !skipIds.has(player.id))) throw new JourneyRoundValidationError("Round input is incomplete");
  }

  private getPlayer(players: JourneyV2Player[], id: string): JourneyV2Player | undefined { return players.find((player) => player.id === id); }
  private getAchievement(game: JourneyV2Game, name: string): JourneyAchievement | null { return Object.values(getJourneyAchievements(game.rules)).find((achievement) => achievement.name === name) ?? null; }
  private getPlayerStatus(player: JourneyV2Player, game: JourneyV2Game): JourneyPlayerStatus { return player.status === "removed" ? "removed" : player.position === getJourneyConfig(game.rules, game.currencies).finishPosition ? "finished" : "active"; }

  private finishGame(game: JourneyV2Game): JourneyV2Game {
    if (game.stateV2.status === "finished") return game;
    game.stateV2.status = "finished";
    const results = [...game.stateV2.players].filter((player) => player.status !== "removed").sort((a, b) => a.nickname.localeCompare(b.nickname, "ru"));
    game.stateV2.forumLog.push("==================== Итоги ====================", ...results.map((player) => `${player.nickname} — [${balanceToJourneyCurrencyValues(player.balance, game.currencies).map((entry) => `${entry.value} ${game.currencies.find((currency) => currency.id === entry.currencyId)?.label ?? entry.currencyId}`).join(", ")}]`), `Финишировали: ${game.stateV2.players.filter((player) => player.status === "finished").length}`);
    game.updatedAt = now();
    return game;
  }

  private buildRoundComments(game: JourneyV2Game, round: JourneyV2Round, randomFn: RandomFn): string[] {
    const comments = [`==================== Ход ${round.index} ====================`];
    round.turns.forEach((turn) => {
      const player = this.getPlayer(game.stateV2.players, turn.playerId);
      if (!player) return;
      if (turn.kind === "skip") { comments.push(`${player.nickname} пропускает ход`); return; }
      const cell = game.stateV2.map[turn.to] ?? null;
      const jackpotRewards = turn.moveType === MOVE_TYPES.JACKPOT
        ? turn.achievementEffects.find((effect) => effect.name === getJourneyAchievements(game.rules).JACKPOT.name)?.appliedRewards ?? []
        : turn.appliedRewards;
      comments.push(buildJourneyComment({
        event: {
          kind: "move",
          playerNickname: player.nickname,
          moveType: turn.moveType,
          requestedRewards: cell && !cell.isJackpot ? clone(cell.rewards) : [],
          appliedRewards: clone(jackpotRewards),
          balanceAfter: balanceToJourneyCurrencyValues(player.balance, game.currencies),
        },
        currencies: game.currencies,
        randomFn,
      }));
      turn.achievementEffects.forEach((effect) => {
        const achievement = this.getAchievement(game, effect.name);
        if (achievement) comments.push(buildJourneyComment({
          event: {
            kind: "achievement",
            playerNickname: player.nickname,
            achievement,
            appliedRewards: effect.appliedRewards,
            balanceAfter: balanceToJourneyCurrencyValues(player.balance, game.currencies),
          },
          currencies: game.currencies,
          randomFn,
        }));
      });
    });
    return comments;
  }
}
