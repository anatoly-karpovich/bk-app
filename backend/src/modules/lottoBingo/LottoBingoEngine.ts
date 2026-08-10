import { randomUUID } from "node:crypto";
import type { HostSnapshot } from "../auth/domain/types";
import type { RewardGrantService, ResourceAmount, ResourceSnapshot } from "../rewards";
import { LottoBingoTicketGenerator } from "./domain/LottoBingoTicketGenerator";
import { normalizeLottoBingoRules } from "./domain/config";
import type {
  LottoBingoCandidateView,
  LottoBingoDrawState,
  LottoBingoGame,
  LottoBingoMatchedAreaView,
  LottoBingoPlayer,
  LottoBingoPayoutCategory,
  LottoBingoRound,
  LottoBingoRules,
  LottoBingoTicketGrid,
} from "./domain/types";
import { AppError } from "../../common/errors";

type CreateOptions = {
  projectId: string;
  configId: string;
  configName: string;
  hostUserId: string;
  hostSnapshot: HostSnapshot;
  rules: LottoBingoRules;
  resources: ResourceSnapshot[];
};

export class LottoBingoEngine {
  constructor(
    private readonly ticketGenerator: LottoBingoTicketGenerator,
    private readonly rewardGrantService: RewardGrantService,
  ) {}

  createGame(options: CreateOptions): LottoBingoGame {
    const now = this.now();
    const game: LottoBingoGame = {
      projectId: options.projectId,
      configId: options.configId,
      configName: options.configName,
      hostUserId: options.hostUserId,
      hostSnapshot: structuredClone(options.hostSnapshot),
      rules: normalizeLottoBingoRules(options.rules),
      resources: structuredClone(options.resources),
      status: "preparing",
      players: [],
      nextTicketNumber: 1,
      draw: null,
      winners: { round1: [], round2: [], round3: [] },
      payouts: [],
      eligibility: null,
      revision: 0,
      lastMutation: "game_created",
      audit: [],
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    };
    return this.withAudit(game, options.hostSnapshot, "game_created", {});
  }

  addPlayer(game: LottoBingoGame, nicknameInput: string, actor: HostSnapshot): LottoBingoGame {
    this.assertPreparing(game);
    const nickname = nicknameInput.trim();
    if (!nickname) throw this.invalid("Player nickname is required");
    if (game.players.some((player) => player.nickname.toLocaleLowerCase("ru") === nickname.toLocaleLowerCase("ru")))
      throw this.invalid(`Duplicate player nickname "${nickname}"`);
    const existingKeys = new Set(game.players.map((player) => this.ticketKey(player.ticket.grid)));
    let grid: LottoBingoTicketGrid | null = null;
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const candidate = this.ticketGenerator.generate();
      if (!existingKeys.has(this.ticketKey(candidate))) {
        grid = candidate;
        break;
      }
    }
    if (!grid) throw this.invalid("Unable to generate a unique ticket");
    const next = this.clone(game);
    const player: LottoBingoPlayer = {
      id: randomUUID(),
      nickname,
      ticket: { number: next.nextTicketNumber, grid },
      status: "active",
      award: null,
    };
    next.players.push(player);
    next.nextTicketNumber += 1;
    return this.withAudit(next, actor, "player_added", { playerId: player.id, ticketNumber: player.ticket.number });
  }

  removePlayer(game: LottoBingoGame, playerId: string, actor: HostSnapshot): LottoBingoGame {
    this.assertPreparing(game);
    const player = this.findPlayer(game, playerId);
    const next = this.clone(game);
    next.players = next.players.filter((candidate) => candidate.id !== player.id);
    return this.withAudit(next, actor, "player_removed", { playerId: player.id, ticketNumber: player.ticket.number });
  }

  startGame(game: LottoBingoGame, actor: HostSnapshot): LottoBingoGame {
    this.assertPreparing(game);
    if (!game.players.length) throw this.invalid("At least one player is required to start Lotto Bingo");
    const order = this.ticketGenerator.shuffle(Array.from({ length: 90 }, (_, index) => index + 1));
    const next = this.clone(game);
    next.status = "in_progress";
    next.startedAt = this.now();
    next.draw = {
      plannedOrder: order.slice(0, next.rules.barrelsToDraw),
      outOfGameNumbers: order.slice(next.rules.barrelsToDraw),
      cursor: 0,
    };
    next.eligibility = { round: 1, eligibleSinceDrawByPlayerId: {} };
    return this.withAudit(next, actor, "game_started", {});
  }

  drawBarrel(game: LottoBingoGame, actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    if (!game.draw || game.draw.cursor >= game.draw.plannedOrder.length)
      throw this.invalid("All planned barrels have already been drawn");
    const next = this.clone(game);
    const barrel = next.draw!.plannedOrder[next.draw!.cursor];
    next.draw!.cursor += 1;
    this.refreshEligibility(next);
    return this.withAudit(next, actor, "barrel_drawn", { barrel, draw: next.draw!.cursor });
  }

  undoLastDraw(game: LottoBingoGame, actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    if (!game.draw || !game.draw.cursor || game.lastMutation !== "barrel_drawn")
      throw this.invalid("Only the latest draw can be undone");
    const next = this.clone(game);
    const barrel = next.draw!.plannedOrder[next.draw!.cursor - 1];
    next.draw!.cursor -= 1;
    this.rebuildEligibility(next);
    return this.withAudit(next, actor, "barrel_undone", { barrel, draw: next.draw!.cursor });
  }

  confirmWinners(game: LottoBingoGame, playerIds: string[], actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    const round = this.getActiveRound(game);
    if (!round) throw this.invalid("No active round is available");
    const ids = [...new Set(playerIds)];
    if (!ids.length || ids.length !== playerIds.length)
      throw this.invalid("Winner list must contain unique player identifiers");
    const candidateIds = new Set(this.getCandidates(game).map((candidate) => candidate.playerId));
    if (ids.some((id) => !candidateIds.has(id))) throw this.invalid("Every winner must be a current candidate");
    const next = this.clone(game);
    const resolvedRewards = this.rewardForRound(next.rules, round);
    const now = this.now();
    const category = `round${round}` as LottoBingoPayoutCategory;
    const winners = ids.map((playerId) => {
      const payoutId = randomUUID();
      next.payouts.push({
        id: payoutId,
        playerId,
        category,
        resolvedRewards: structuredClone(resolvedRewards),
        createdAt: now,
      });
      const player = this.findPlayer(next, playerId);
      player.status = "round_winner";
      player.award = { type: "round", round, rewards: structuredClone(resolvedRewards) };
      return {
        playerId,
        confirmedAt: now,
        confirmedOnDraw: next.draw?.cursor ?? 0,
        winningBarrel: this.getDrawnNumbers(next).at(-1) ?? null,
        payoutId,
      };
    });
    next.winners[`round${round}`] = winners;
    next.eligibility = round === 3 ? null : { round: (round + 1) as LottoBingoRound, eligibleSinceDrawByPlayerId: {} };
    this.refreshEligibility(next);
    return this.withAudit(next, actor, "winner_confirmed", {
      round,
      playerIds: ids,
      payoutIds: winners.map((winner) => winner.payoutId),
    });
  }

  disqualifyPlayer(game: LottoBingoGame, playerId: string, actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    const next = this.clone(game);
    const player = this.findPlayer(next, playerId);
    if (player.status === "disqualified") throw this.invalid("Player is already disqualified");
    player.status = "disqualified";
    return this.withAudit(next, actor, "player_disqualified", { playerId });
  }
  restorePlayer(game: LottoBingoGame, playerId: string, actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    const next = this.clone(game);
    const player = this.findPlayer(next, playerId);
    if (player.status !== "disqualified") throw this.invalid("Player is not disqualified");
    player.status = player.award?.type === "round" ? "round_winner" : "active";
    this.refreshEligibility(next);
    return this.withAudit(next, actor, "player_restored", { playerId });
  }

  finalizeGame(game: LottoBingoGame, actor: HostSnapshot): LottoBingoGame {
    this.assertInProgress(game);
    if (!game.draw || game.draw.cursor !== game.draw.plannedOrder.length)
      throw this.invalid("The game can be finalized only after all planned barrels are drawn");
    const next = this.clone(game);
    const now = this.now();
    const completed = next.players.filter(
      (player) => player.status === "active" && this.getProgress(next, player).completedCard,
    );
    const consolation = next.players.filter(
      (player) => player.status === "active" && !this.getProgress(next, player).completedCard,
    );
    this.applyFinalPayouts(next, completed, "completed_card", now);
    this.applyFinalPayouts(next, consolation, "consolation", now);
    next.status = "finished";
    next.finishedAt = now;
    next.eligibility = null;
    return this.withAudit(next, actor, "game_finished", {
      completedCardPlayerIds: completed.map((player) => player.id),
      consolationPlayerIds: consolation.map((player) => player.id),
    });
  }

  getPhase(game: LottoBingoGame) {
    if (game.status === "preparing") return "registration" as const;
    if (game.status === "finished") return "finished" as const;
    if (game.draw && game.draw.cursor >= game.draw.plannedOrder.length) return "ready_to_finalize" as const;
    const round = this.getActiveRound(game);
    return round ? (`round${round}` as const) : ("remaining_barrels" as const);
  }
  getActiveRound(game: LottoBingoGame): LottoBingoRound | null {
    if (game.status !== "in_progress") return null;
    if (!game.winners.round1.length) return 1;
    if (!game.winners.round2.length) return 2;
    if (!game.winners.round3.length) return 3;
    return null;
  }
  getDrawnNumbers(game: LottoBingoGame): number[] {
    return game.draw ? game.draw.plannedOrder.slice(0, game.draw.cursor) : [];
  }
  getCandidates(game: LottoBingoGame): LottoBingoCandidateView[] {
    const round = this.getActiveRound(game);
    if (!round || !game.draw || !game.eligibility) return [];
    const latestDraw = game.draw.cursor;
    return game.players
      .filter((player) => player.status === "active" && this.matchesRound(game, player, round).length)
      .map((player) => {
        const eligibleSinceDraw = game.eligibility!.eligibleSinceDrawByPlayerId[player.id] ?? latestDraw;
        return {
          playerId: player.id,
          nickname: player.nickname,
          eligibleSinceDraw,
          becameEligibleOnLatestDraw: eligibleSinceDraw === latestDraw,
          matchedAreas: this.matchesRound(game, player, round),
        };
      });
  }
  getProgress(game: LottoBingoGame, player: LottoBingoPlayer) {
    const ticketNumbers = player.ticket.grid.flat().filter((value): value is number => value !== null);
    const drawn = new Set(this.getDrawnNumbers(game));
    const matchedNumbers = ticketNumbers.filter((number) => drawn.has(number));
    const remainingNumbers = ticketNumbers.filter((number) => !drawn.has(number));
    const completedRowIndexes = player.ticket.grid.flatMap((row, index) =>
      this.isComplete(row, drawn) ? [index] : [],
    );
    const completedHalves: Array<"top" | "bottom"> = [];
    if ([0, 1, 2].every((index) => this.isComplete(player.ticket.grid[index], drawn))) completedHalves.push("top");
    if ([3, 4, 5].every((index) => this.isComplete(player.ticket.grid[index], drawn))) completedHalves.push("bottom");
    return {
      matchedNumbers,
      remainingNumbers,
      completedRowIndexes,
      completedHalves,
      completedCard: remainingNumbers.length === 0,
    };
  }
  ticketKey(grid: LottoBingoTicketGrid): string {
    return grid
      .flat()
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)
      .join(",");
  }

  private applyFinalPayouts(
    game: LottoBingoGame,
    players: LottoBingoPlayer[],
    category: "completed_card" | "consolation",
    now: string,
  ) {
    if (!players.length) return;
    const pool = category === "completed_card" ? game.rules.rewards.completedCard : game.rules.rewards.consolation;
    const rewards = this.rewardGrantService.resolve(pool);
    players.forEach((player) => {
      game.payouts.push({
        id: randomUUID(),
        playerId: player.id,
        category,
        resolvedRewards: structuredClone(rewards),
        createdAt: now,
      });
      player.award = { type: category, rewards: structuredClone(rewards) };
    });
  }
  private refreshEligibility(game: LottoBingoGame) {
    const round = this.getActiveRound(game);
    if (!round || !game.eligibility || !game.draw) return;
    if (game.eligibility.round !== round) game.eligibility = { round, eligibleSinceDrawByPlayerId: {} };
    const map = game.eligibility.eligibleSinceDrawByPlayerId;
    game.players.forEach((player) => {
      if (player.status === "active" && this.matchesRound(game, player, round).length && map[player.id] === undefined)
        map[player.id] = game.draw!.cursor;
    });
  }
  private rebuildEligibility(game: LottoBingoGame) {
    const round = this.getActiveRound(game);
    if (!round || !game.draw) return;
    game.eligibility = { round, eligibleSinceDrawByPlayerId: {} };
    for (let cursor = 1; cursor <= game.draw.cursor; cursor += 1) {
      const copy = this.clone(game);
      copy.draw!.cursor = cursor;
      copy.players.forEach((player) => {
        if (
          player.status === "active" &&
          this.matchesRound(copy, player, round).length &&
          game.eligibility!.eligibleSinceDrawByPlayerId[player.id] === undefined
        )
          game.eligibility!.eligibleSinceDrawByPlayerId[player.id] = cursor;
      });
    }
  }
  private matchesRound(
    game: LottoBingoGame,
    player: LottoBingoPlayer,
    round: LottoBingoRound,
  ): LottoBingoMatchedAreaView[] {
    const drawn = new Set(this.getDrawnNumbers(game));
    const progress = this.getProgress(game, player);
    if (round === 1)
      return progress.completedRowIndexes.map((rowIndex) => ({ type: "row" as const, rowIndexes: [rowIndex] }));
    if (round === 2)
      return progress.completedHalves.map((half) => ({
        type: "half" as const,
        half,
        rowIndexes: half === "top" ? [0, 1, 2] : [3, 4, 5],
      }));
    return progress.completedCard ? [{ type: "full_card", rowIndexes: [0, 1, 2, 3, 4, 5] }] : [];
  }
  private isComplete(row: Array<number | null>, drawn: ReadonlySet<number>) {
    return row.every((cell) => cell === null || drawn.has(cell));
  }
  private rewardForRound(rules: LottoBingoRules, round: LottoBingoRound): ResourceAmount[] {
    return this.rewardGrantService.resolve(rules.rewards[`round${round}`]);
  }
  private withAudit(
    game: LottoBingoGame,
    actor: HostSnapshot,
    type: LottoBingoGame["lastMutation"],
    payload: Record<string, unknown>,
  ) {
    const next = this.clone(game);
    const now = this.now();
    next.updatedAt = now;
    next.revision += 1;
    next.lastMutation = type;
    next.audit.push({
      id: randomUUID(),
      sequence: next.audit.length + 1,
      type,
      actor: structuredClone(actor),
      createdAt: now,
      payload,
    });
    return next;
  }
  private findPlayer(game: LottoBingoGame, playerId: string) {
    const player = game.players.find((candidate) => candidate.id === playerId);
    if (!player) throw this.invalid("Lotto Bingo player not found");
    return player;
  }
  private assertPreparing(game: LottoBingoGame) {
    if (game.status !== "preparing") throw this.invalid("This operation is available only during registration");
  }
  private assertInProgress(game: LottoBingoGame) {
    if (game.status !== "in_progress")
      throw this.invalid("This operation is available only while the game is in progress");
  }
  private invalid(message: string) {
    return new AppError(message, { statusCode: 400, code: "lotto_bingo_invalid_operation" });
  }
  private clone<T>(value: T): T {
    return structuredClone(value);
  }
  private now(): string {
    return new Date().toISOString();
  }
}
