import assert from "node:assert/strict";
import test from "node:test";
import { RewardGrantService, type Randomizer, type ResourceSnapshot } from "../../rewards";
import { JourneyV2Engine } from "../JourneyV2Engine";
import { JourneyForumStateFormatter } from "../JourneyForumStateFormatter";
import { JourneyReadModelFactory } from "../JourneyReadModelFactory";
import { JourneyCommentTemplateRotator } from "./JourneyCommentTemplateRotator";
import { JourneyResourceInventoryService } from "./JourneyResourceInventoryService";
import {
  buildJourneyResourceAchievementComment,
  buildJourneyResourceMoveComment,
  JOURNEY_COMMENT_TEMPLATES,
} from "./commentTemplates";
import { MOVE_TYPES } from "./config";
import type { JourneyGameView, JourneyRules } from "./types";
import { JourneyRewardCommentFormatter } from "./JourneyRewardCommentFormatter";
import {
  buildJourneyRoundMarker,
  JOURNEY_GAME_MAP_MARKER,
  JOURNEY_GAME_RESULTS_MARKER,
  JOURNEY_GAME_STARTED_MARKER,
} from "../JourneyForumMarkers";

const resources: ResourceSnapshot[] = [
  { id: "coins", code: "coins", name: "Монеты", label: "монет", type: "currency", valueType: "integer", precision: 0 },
  { id: "key", code: "key", name: "Ключ", label: "ключ", type: "item" },
];

const randomizer: Randomizer = {
  succeeds: () => true,
  pickWeightedIndex: () => 0,
};

const all = (...rewards: Array<{ resourceId: string; amount: number }>) => ({ mode: "all" as const, rewards });

function rules(overrides: Partial<JourneyRules> = {}): JourneyRules {
  return {
    initialRewardPool: all(),
    minDice: 1,
    maxDice: 1,
    resourceLimits: [{ resourceId: "coins", min: 0, max: 10 }],
    mapSize: 3,
    jackpot: {
      countMode: "fixed",
      count: 0,
      playersPerJackpot: 1,
      rewardPool: all({ resourceId: "coins", amount: 5 }),
    },
    cells: [],
    achievements: {
      unlucky: { rewardPool: all() },
      careful: { rewardPool: all() },
      collector: { rewardPool: all() },
      lucky: { rewardPool: all() },
    },
    ...overrides,
  };
}

function createEngine(): JourneyV2Engine {
  return new JourneyV2Engine(
    new RewardGrantService(randomizer),
    new JourneyResourceInventoryService(),
    new JourneyRewardCommentFormatter(),
    new JourneyCommentTemplateRotator(),
  );
}

test("formats aggregated gains, losses, and limited amounts by resource id", () => {
  const formatter = new JourneyRewardCommentFormatter();

  assert.deepEqual(
    formatter.format(
      resources,
      [
        { resourceId: "coins", amount: 10 },
        { resourceId: "key", amount: 1 },
        { resourceId: "coins", amount: 5 },
        { resourceId: "unknown", amount: -4 },
      ],
      [
        { resourceId: "key", amount: 1 },
        { resourceId: "coins", amount: 7 },
        { resourceId: "unknown", amount: -2 },
      ],
    ),
    {
      resolvedGain: "15 монет и 1 ключ",
      resolvedLoss: "4 unknown",
      gained: "7 монет и 1 ключ",
      lost: "2 unknown",
      unappliedGain: "8 монет",
      unappliedLoss: "2 unknown",
    },
  );
});

test("renders Journey move and achievement texts from templates without the balance", () => {
  const moveComment = buildJourneyResourceMoveComment({
    playerNickname: "Анатолий",
    moveType: MOVE_TYPES.INCREASE,
    rewardLabel: "20 монет",
    requestedRewardLabel: "20 монет",
    randomFn: () => 0,
  });
  const achievementComment = buildJourneyResourceAchievementComment({
    playerNickname: "Анатолий",
    achievement: { name: "Careful", title: "Осторожный", rewardPool: all() },
    rewardLabel: "5 монет",
    randomFn: () => 0,
  });

  assert.match(moveComment, /20 монет/);
  assert.match(achievementComment, /5 монет/);
  assert.ok(!moveComment.includes("["));
  assert.ok(!achievementComment.includes("["));
});

test("lists saved achievement and jackpot grants in the forum state", () => {
  const game = {
    updatedAt: "2026-08-01T00:00:00.000Z",
    configuration: { resources },
    state: {
      players: [
        {
          id: "player",
          nickname: "Анатолий",
          status: "active",
          position: 5,
          baseRewardEntries: [{ resourceId: "coins", amount: 5 }],
          bonusRewardEntries: [
            { resourceId: "coins", amount: 5 },
            { resourceId: "key", amount: 1 },
          ],
          balanceEntries: [
            { resourceId: "coins", amount: 10 },
            { resourceId: "key", amount: 1 },
          ],
          bonuses: [
            {
              name: "Lucky",
              title: "Счастливчик",
              source: "achievement" as const,
              appliedRewards: [
                { resourceId: "coins", amount: 5 },
                { resourceId: "key", amount: 1 },
              ],
            },
            { name: "Jackpot", title: "Сокровище", source: "jackpot" as const, appliedRewards: [] },
          ],
        },
      ],
    },
  } as JourneyGameView;

  assert.equal(
    new JourneyForumStateFormatter().create(game).text,
    [
      "==================== Текущее положение ====================",
      "",
      "Анатолий: Итоговая награда: [10 монет, 1 ключ], Клетка: [5]",
      "   Бонусы:",
      "   - Сокровище: [без дополнительной награды]",
      "   - Достижение «Счастливчик»: [5 монет, 1 ключ]",
    ].join("\n"),
  );
});

test("rotates every template in a group before it repeats and restores by template id", () => {
  const rotator = new JourneyCommentTemplateRotator();
  const kind = "move:moveWithIncreasingPrize" as const;
  const random = () => 0.25;
  const state = rotator.createState(random);
  const references = JOURNEY_COMMENT_TEMPLATES[kind].map(() => rotator.takeNext(state, kind, random));

  assert.equal(new Set(references.map((reference) => reference.templateId)).size, references.length);
  assert.equal(state.lastSelectedIds[kind], undefined);
  references.forEach((reference) => {
    assert.ok(rotator.getTemplate(structuredClone(state), reference).text.length > 0);
  });

  const nextReference = rotator.takeNext(state, kind, random);
  assert.ok(references.some((reference) => reference.templateId === nextReference.templateId));
});

test("stores selected comment template references in a new Journey round", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], { resources, rules: rules() });
  game.stateV2.map = {
    1: { id: "bonus", kind: "bonus", rewardPool: all({ resourceId: "coins", amount: 1 }) },
  };
  const player = game.stateV2.players[0];

  const next = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);
  const turn = next.stateV2.rounds[0].turns[0];

  assert.equal(turn.kind, "move");
  assert.equal(turn.commentRefs.length, 1);
  assert.equal(turn.commentRefs[0].kind, "move:moveWithIncreasingPrize");
  assert.ok(
    next.stateV2.commentState?.snapshot[turn.commentRefs[0].kind].some(
      (template) => template.id === turn.commentRefs[0].templateId,
    ),
  );
});

test("writes a limited cell reward with only its move comment", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], {
    resources,
    rules: rules({
      initialRewardPool: all({ resourceId: "coins", amount: 5 }),
      cells: [
        {
          id: "bonus",
          kind: "bonus",
          mapLabel: "B",
          count: 1,
          rewardPool: all({ resourceId: "coins", amount: 10 }, { resourceId: "key", amount: 1 }),
        },
      ],
    }),
  });
  game.stateV2.map = {
    1: {
      id: "bonus",
      kind: "bonus",
      rewardPool: all({ resourceId: "coins", amount: 10 }, { resourceId: "key", amount: 1 }),
    },
  };
  const player = game.stateV2.players[0];

  const next = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);

  const [roundTitle, moveComment] = next.stateV2.forumLog.slice(-2);
  assert.equal(roundTitle, buildJourneyRoundMarker(1));
  assert.match(moveComment, /5 монет и 1 ключ/);
  assert.ok(!moveComment.includes("["));
  assert.equal(
    next.stateV2.rounds[0].turns[0].kind === "move" ? next.stateV2.rounds[0].turns[0].commentRefs.length : 0,
    1,
  );
});

test("uses shared forum markers for the game start and each move", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], { resources, rules: rules() });
  game.stateV2.map = {};
  const player = game.stateV2.players[0];

  const next = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);

  assert.equal(next.stateV2.forumLog[0], JOURNEY_GAME_STARTED_MARKER);
  assert.ok(next.stateV2.forumLog.includes(buildJourneyRoundMarker(1)));
});

test("keeps and publishes the game map after the final move", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], { resources, rules: rules({ mapSize: 1 }) });
  const player = game.stateV2.players[0];
  game.stateV2.map = {
    1: { id: "bonus", kind: "bonus", rewardPool: all({ resourceId: "coins", amount: 5 }) },
  };

  const afterFirstMove = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);
  const finished = engine.makeRound(afterFirstMove, [{ playerId: player.id, dice: 1 }]);

  assert.equal(finished.stateV2.status, "finished");
  assert.deepEqual(finished.stateV2.map, game.stateV2.map);
  assert.ok(finished.stateV2.forumLog.includes(JOURNEY_GAME_RESULTS_MARKER));
  assert.ok(finished.stateV2.forumLog.includes(JOURNEY_GAME_MAP_MARKER));
  assert.ok(finished.stateV2.forumLog.includes("На клетке 1 находится награда на +5 монет"));
});

test("uses moveType to distinguish won, empty, and already claimed jackpots", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий", "Борис"], { resources, rules: rules() });
  game.stateV2.map = {
    1: {
      id: "jackpot",
      kind: "bonus",
      isJackpot: true,
      rewardPool: all({ resourceId: "coins", amount: 5 }),
      winner: null,
    },
  };
  const anatoliy = game.stateV2.players.find((player) => player.nickname === "Анатолий")!;
  const boris = game.stateV2.players.find((player) => player.nickname === "Борис")!;

  const won = engine.makeRound(game, [{ playerId: anatoliy.id, dice: 1 }], [boris.id]);
  assert.ok(won.stateV2.forumLog.some((comment) => comment.includes("5 монет") && !comment.includes("[")));

  const claimedGame = engine.createGame(["Анатолий", "Борис"], { resources, rules: rules() });
  claimedGame.stateV2.map = {
    1: {
      id: "jackpot",
      kind: "bonus",
      isJackpot: true,
      rewardPool: all({ resourceId: "coins", amount: 5 }),
      winner: { nickname: "Борис" },
    },
  };
  const claimedAnatoliy = claimedGame.stateV2.players.find((player) => player.nickname === "Анатолий")!;
  const claimedBoris = claimedGame.stateV2.players.find((player) => player.nickname === "Борис")!;

  const claimed = engine.makeRound(claimedGame, [{ playerId: claimedAnatoliy.id, dice: 1 }], [claimedBoris.id]);
  assert.ok(claimed.stateV2.forumLog.slice(-2).some((comment) => !comment.includes("[") && comment.length > 0));
});

test("does not apply a base-reward limit to a jackpot", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], {
    resources,
    rules: rules({
      initialRewardPool: all({ resourceId: "coins", amount: 5 }),
      resourceLimits: [{ resourceId: "coins", min: 0, max: 5 }],
    }),
  });
  game.stateV2.map = {
    1: {
      id: "jackpot",
      kind: "bonus",
      isJackpot: true,
      rewardPool: all({ resourceId: "coins", amount: 5 }),
      winner: null,
    },
  };
  const player = game.stateV2.players[0];

  const next = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);

  assert.equal(next.stateV2.players[0].balance.coins, 10);
  const turn = next.stateV2.rounds[0].turns[0];
  assert.equal(turn.kind, "move");
  assert.deepEqual(turn.appliedRewards, [{ resourceId: "coins", amount: 5 }]);
});

test("keeps base rewards limited separately from saved jackpot rewards in the game view and forum state", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], {
    resources,
    rules: rules({
      initialRewardPool: all({ resourceId: "coins", amount: 5 }),
      resourceLimits: [{ resourceId: "coins", min: 0, max: 5 }],
    }),
  });
  game.stateV2.map = {
    1: {
      id: "jackpot",
      kind: "bonus",
      isJackpot: true,
      rewardPool: all({ resourceId: "coins", amount: 7 }, { resourceId: "key", amount: 1 }),
      winner: null,
    },
    2: { id: "bonus", kind: "bonus", rewardPool: all({ resourceId: "coins", amount: 2 }) },
  };
  const player = game.stateV2.players[0];

  const afterJackpot = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);
  const afterBaseMove = engine.makeRound(afterJackpot, [{ playerId: player.id, dice: 1 }]);
  const summary = engine.getPlayerRewardSummary(afterBaseMove, afterBaseMove.stateV2.players[0]);

  assert.deepEqual(summary.baseRewardEntries, [{ resourceId: "coins", amount: 5 }]);
  assert.deepEqual(summary.bonusRewardEntries, [
    { resourceId: "coins", amount: 7 },
    { resourceId: "key", amount: 1 },
  ]);
  assert.deepEqual(summary.balanceEntries, [
    { resourceId: "coins", amount: 12 },
    { resourceId: "key", amount: 1 },
  ]);
  assert.equal(summary.bonuses[0].name, "Jackpot");
  assert.equal(summary.bonuses[0].source, "jackpot");
  assert.deepEqual(summary.bonuses[0].appliedRewards, [
    { resourceId: "coins", amount: 7 },
    { resourceId: "key", amount: 1 },
  ]);
  assert.deepEqual(
    afterBaseMove.stateV2.rounds[1].turns[0].kind === "move"
      ? afterBaseMove.stateV2.rounds[1].turns[0].appliedRewards
      : [],
    [{ resourceId: "coins", amount: 0 }],
  );

  const view = new JourneyReadModelFactory(engine).create({
    ...afterBaseMove,
    _id: { toHexString: () => "journey" },
  } as any);
  assert.deepEqual(view.state.players[0].balanceEntries, summary.balanceEntries);
  assert.deepEqual(view.state.players[0].bonuses, summary.bonuses);
  assert.match(new JourneyForumStateFormatter().create(view).text, /12 монет, 1 ключ/);
});

test("reports an empty weighted jackpot as a won jackpot without a reward", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], { resources, rules: rules() });
  game.stateV2.map = {
    1: {
      id: "jackpot",
      kind: "bonus",
      isJackpot: true,
      rewardPool: { mode: "weighted_one", options: [{ reward: null, weight: 1 }] },
      winner: null,
    },
  };
  const player = game.stateV2.players[0];

  const next = engine.makeRound(game, [{ playerId: player.id, dice: 1 }]);

  assert.ok(next.stateV2.forumLog.some((comment) => /награда не выпадает|внутри оказывается пусто/.test(comment)));
});

test("does not apply a base-reward limit to an achievement reward", () => {
  const engine = createEngine();
  const game = engine.createGame(["Анатолий"], {
    resources,
    rules: rules({
      resourceLimits: [{ resourceId: "coins", min: 0, max: 5 }],
      mapSize: 6,
      achievements: {
        unlucky: { rewardPool: all() },
        careful: { rewardPool: all({ resourceId: "coins", amount: 10 }) },
        collector: { rewardPool: all() },
        lucky: { rewardPool: all() },
      },
    }),
  });
  game.stateV2.map = {};
  const player = game.stateV2.players[0];
  let next = game;

  for (let round = 0; round < 4; round += 1) {
    next = engine.makeRound(next, [{ playerId: player.id, dice: 1 }]);
  }

  assert.equal(next.stateV2.players[0].balance.coins, 10);
  const awarded = next.stateV2.rounds[3].turns[0];
  assert.equal(awarded.kind, "move");
  assert.deepEqual(awarded.achievementEffects[0].appliedRewards, [{ resourceId: "coins", amount: 10 }]);
  assert.ok(!next.stateV2.forumLog.some((comment) => comment.includes("достигнут максимальный лимит")));
});
