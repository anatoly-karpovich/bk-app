import assert from "node:assert/strict";
import test from "node:test";
import { RewardGrantService } from "../rewards";
import { LottoBingoEngine } from "./LottoBingoEngine";
import { LottoBingoTicketGenerator, type RandomSource } from "./domain/LottoBingoTicketGenerator";
import type { LottoBingoRules, LottoBingoTicketGrid } from "./domain/types";

const host = { userId: "host", displayName: "Host", nickname: "Host" };
function createRandomSource(): RandomSource {
  let state = 123_456_789;
  return {
    next: () => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    },
  };
}
const rules: LottoBingoRules = {
  barrelsToDraw: 87,
  rewards: {
    round1: { mode: "all", rewards: [{ resourceId: "coins", amount: 10 }] },
    round2: { mode: "all", rewards: [] },
    round3: { mode: "all", rewards: [] },
    completedCard: { mode: "all", rewards: [{ resourceId: "coins", amount: 3 }] },
    consolation: { mode: "all", rewards: [{ resourceId: "coins", amount: 1 }] },
  },
};

function engine() {
  return new LottoBingoEngine(
    new LottoBingoTicketGenerator(createRandomSource()),
    new RewardGrantService({ succeeds: () => false, pickWeightedIndex: () => 0 }),
  );
}
function grid(start: number): LottoBingoTicketGrid {
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 9 }, (_, column) => (column < 5 ? start + row * 5 + column : null)),
  );
}
function startedGame() {
  const value = engine();
  let game = value.createGame({
    projectId: "project",
    configId: "config",
    configName: "Config",
    hostUserId: "host",
    hostSnapshot: host,
    rules,
    resources: [],
  });
  game = value.addPlayer(game, { nickname: "Alpha", playerRefId: "player-alpha" }, host);
  game = value.addPlayer(game, { nickname: "Beta", playerRefId: "player-beta" }, host);
  game.players[0].ticket.grid = grid(1);
  game.players[1].ticket.grid = grid(1);
  game = value.startGame(game, host);
  return { value, game };
}

test("confirms several current candidates atomically and uses the same resolved round reward", () => {
  const { value, game: started } = startedGame();
  const game = structuredClone(started);
  game.draw = { plannedOrder: [1, 2, 3, 4, 5], outOfGameNumbers: [6], cursor: 4 };
  const afterDraw = value.drawBarrel(game, host);
  const candidates = value.getCandidates(afterDraw);
  assert.equal(candidates.length, 2);

  const confirmed = value.confirmWinners(
    afterDraw,
    candidates.map((candidate) => candidate.playerId),
    host,
  );
  assert.equal(confirmed.winners.round1.length, 2);
  assert.deepEqual(
    confirmed.payouts.map((payout) => payout.resolvedRewards),
    [[{ resourceId: "coins", amount: 10 }], [{ resourceId: "coins", amount: 10 }]],
  );
  assert.equal(confirmed.audit.at(-1)?.type, "winner_confirmed");
});

test("rejects the same Player identity even when an alias is supplied", () => {
  const value = engine();
  const game = value.createGame({
    projectId: "project",
    configId: "config",
    configName: "Config",
    hostUserId: "host",
    hostSnapshot: host,
    rules,
    resources: [],
  });
  const withPlayer = value.addPlayer(game, { nickname: "Alpha", playerRefId: "player-1" }, host);

  assert.throws(
    () => value.addPlayer(withPlayer, { nickname: "Other Alpha", playerRefId: "player-1" }, host),
    { code: "lotto_bingo_invalid_operation" },
  );
});

test("never draws an excluded barrel after the planned order is exhausted", () => {
  const { value, game: started } = startedGame();
  const game = structuredClone(started);
  game.draw = { plannedOrder: [1], outOfGameNumbers: [2, 3], cursor: 0 };
  const afterDraw = value.drawBarrel(game, host);
  assert.throws(() => value.drawBarrel(afterDraw, host), { code: "lotto_bingo_invalid_operation" });
  const finished = value.finalizeGame(afterDraw, host);
  assert.equal(finished.status, "finished");
  assert.equal(finished.winners.round1.length, 0);
  assert.equal(finished.payouts.filter((payout) => payout.category === "consolation").length, 2);
});
