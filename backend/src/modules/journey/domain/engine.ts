import {
  oldbk2_rules,
  DEFAULT_JOURNEY_RULESET,
  getJourneyAchievements,
  getJourneyBonusCells,
  getJourneyConfig,
  getNonJackpotPrizes,
  MOVE_TYPES,
  normalizeJourneyRules,
} from "./config";
import { buildJourneyComment } from "./commentTemplates";
import type {
  JourneyAchievement,
  JourneyAchievementMove,
  JourneyAchievementsByPlayerId,
  JourneyGame,
  JourneyMapCell,
  JourneyMove,
  JourneyMoveInput,
  JourneyMoveType,
  JourneyMovesByPlayerId,
  JourneyPlayer,
  JourneyPlayersById,
  JourneyRound,
  JourneyRoundEntry,
  JourneyRules,
  JourneyRuleset,
  RandomFn,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getNowIso(): string {
  return new Date().toISOString();
}

function getGameRules(game: JourneyGame | null | undefined): JourneyRules {
  return normalizeJourneyRules(game?.rules ?? oldbk2_rules);
}

function generatePlayerId(nickname = "player"): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${nickname}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomInteger(min: number, max: number, randomFn: RandomFn = Math.random): number {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

function getPlayerByNickname(game: JourneyGame, nickname: string): JourneyPlayer | undefined {
  return game.players.find((player) => player.nickname === nickname);
}

function getPlayerById(game: JourneyGame, playerId: string): JourneyPlayer | undefined {
  return game.players.find((player) => player.id === playerId);
}

function playerHasBonus(player: JourneyPlayer, bonusName: string): boolean {
  return player.bonuses.some((bonus) => bonus.name === bonusName);
}

function getAchievementBonus(name: string, rules: JourneyRules = oldbk2_rules): JourneyAchievement | null {
  return Object.values(getJourneyAchievements(rules)).find((achievement) => achievement.name === name) ?? null;
}

function buildRoundHeader(moveIndex: number): string {
  return `==================== Ход ${moveIndex} ====================`;
}

function isTrapMove(move: { cell: JourneyMapCell | null }): boolean {
  return Boolean(move.cell && move.cell.prize < 0);
}

function isPositiveRewardMove(move: { cell: JourneyMapCell | null }): boolean {
  return Boolean(move.cell && move.cell.prize > 0);
}

function getPlayerStatus(player: JourneyPlayer, finishPosition: number): JourneyPlayer["status"] {
  if (player.removedAt || player.status === "removed") {
    return "removed";
  }

  if (player.position === finishPosition) {
    return "finished";
  }

  return "active";
}

function indexPlayersById(players: JourneyPlayer[]): JourneyPlayersById {
  return players.reduce<JourneyPlayersById>((accumulator, player) => {
    accumulator[player.id] = player;
    return accumulator;
  }, {});
}

function refreshGameIndexes(game: JourneyGame, updateTimestamp = true): JourneyGame {
  const { finishPosition } = getJourneyConfig(getGameRules(game));

  game.players.forEach((player) => {
    player.status = getPlayerStatus(player, finishPosition);
  });

  game.playersById = indexPlayersById(game.players);

  if (updateTimestamp) {
    game.updatedAt = getNowIso();
  }

  return game;
}

function isCarefulEligibleMove(
  move: { currentPosition?: number | null; position?: number; type?: string | null; cell: JourneyMapCell | null },
  finishPosition: number,
): boolean {
  const movePosition = move.currentPosition ?? move.position;

  if (movePosition === finishPosition || move.type === MOVE_TYPES.JACKPOT) {
    return false;
  }

  if (!move.cell) {
    return true;
  }

  if (move.cell.isJackpot) {
    return move.type !== MOVE_TYPES.JACKPOT;
  }

  return !move.cell.prize;
}

function createPlayer(nickname: string, rules: JourneyRules): JourneyPlayer {
  const { initialPrize } = getJourneyConfig(rules);

  return {
    id: generatePlayerId(nickname),
    nickname,
    status: "active",
    removedAt: null,
    removedReason: null,
    position: 0,
    previousPosition: 0,
    previousPrize: initialPrize,
    prize: initialPrize,
    bonuses: [],
    movesHistory: [],
  };
}

function createMap(rules: JourneyRules, randomFn: RandomFn = Math.random): Record<number, JourneyMapCell> {
  const { mapSize } = getJourneyConfig(rules);
  const availableCells = Array.from({ length: mapSize }, (_, index) => index + 1);
  const gameMap: Record<number, JourneyMapCell> = {};

  getJourneyBonusCells(rules).forEach(({ cell, amount }) => {
    for (let index = 0; index < amount; index += 1) {
      const randomCellIndex = randomInteger(0, availableCells.length - 1, randomFn);
      const [position] = availableCells.splice(randomCellIndex, 1);
      gameMap[position] = clone(cell);
    }
  });

  return gameMap;
}

function buildMove(
  player: JourneyPlayer,
  dice: number,
  gameMap: Record<number, JourneyMapCell>,
  rules: JourneyRules,
): JourneyMove | null {
  const journeyConfig = getJourneyConfig(rules);
  const maxPrize = journeyConfig.maxPrize;
  const hasPrizeLimit = maxPrize !== null;

  if (player.position === journeyConfig.finishPosition) {
    return null;
  }

  const currentPosition = Math.min(player.position + dice, journeyConfig.finishPosition);
  const cell = gameMap[currentPosition] ? clone(gameMap[currentPosition]) : null;
  let prize = player.prize;
  let type: JourneyMoveType = MOVE_TYPES.EMPTY;

  if (cell && cell.prize) {
    if (hasPrizeLimit && prize < maxPrize && prize + cell.prize > maxPrize) {
      prize = maxPrize;
      type = MOVE_TYPES.TO_MAX;
    } else if (hasPrizeLimit && prize + cell.prize > maxPrize) {
      type = MOVE_TYPES.AT_MAX;
    } else if (prize >= 0 && prize + cell.prize < 0) {
      prize = 0;
      type = player.prize ? MOVE_TYPES.TO_ZERO : MOVE_TYPES.AT_ZERO;
    } else {
      prize += cell.prize;
      type = cell.prize > 0 ? MOVE_TYPES.INCREASE : MOVE_TYPES.DECREASE;
    }
  }

  if (currentPosition === journeyConfig.finishPosition) {
    type = MOVE_TYPES.FINISH;
  }

  return {
    playerId: player.id,
    playerNickname: player.nickname,
    dice,
    previousPosition: player.position,
    previousPrize: player.prize,
    currentPosition,
    prize,
    cell,
    type,
  };
}

function applyJackpots(
  game: JourneyGame,
  movesByPlayerId: JourneyMovesByPlayerId,
  rules: JourneyRules,
  randomFn: RandomFn = Math.random,
) {
  const journeyAchievements = getJourneyAchievements(rules);
  const jackpotCells = Object.entries(game.map).filter(([, cell]) => cell.isJackpot);

  jackpotCells.forEach(([position, cell]) => {
    const cellPosition = Number(position);
    const movesOnCell = Object.values(movesByPlayerId).filter((move) => move.currentPosition === cellPosition);

    if (!movesOnCell.length) {
      return;
    }

    if (!cell.winner) {
      const eligiblePlayers = movesOnCell
        .map((move) => getPlayerById(game, move.playerId))
        .filter((player): player is JourneyPlayer => Boolean(player))
        .filter((player) => !playerHasBonus(player, journeyAchievements.JACKPOT.name));

      if (eligiblePlayers.length) {
        const winner = eligiblePlayers[randomInteger(0, eligiblePlayers.length - 1, randomFn)];
        game.map[cellPosition].winner = { nickname: winner.nickname };
        movesByPlayerId[winner.id].type = MOVE_TYPES.JACKPOT;
      }
    }

    const jackpotCell = game.map[cellPosition];

    if (!jackpotCell.winner) {
      return;
    }

    const winnerId = getPlayerByNickname(game, jackpotCell.winner.nickname)?.id;

    movesOnCell
      .filter((move) => move.playerId !== winnerId)
      .forEach((move) => {
        move.type = MOVE_TYPES.EMPTY_JACKPOT;
      });
  });
}

function getAchievementMovesForPlayer(
  player: JourneyPlayer,
  move: JourneyMove,
  rules: JourneyRules,
): JourneyAchievementMove[] {
  const journeyAchievements = getJourneyAchievements(rules);
  const nonJackpotPrizes = getNonJackpotPrizes(rules);
  const { finishPosition } = getJourneyConfig(rules);
  const achievementMoves: JourneyAchievement[] = [];

  if (
    player.movesHistory.length >= 2 &&
    player.movesHistory.slice(-2).every((historyMove) => historyMove.cell && historyMove.cell.prize < 0) &&
    isTrapMove(move) &&
    !playerHasBonus(player, journeyAchievements.UNLUCKY.name)
  ) {
    achievementMoves.push(journeyAchievements.UNLUCKY);
  }

  if (
    player.movesHistory.length >= 2 &&
    [...player.movesHistory.slice(-2), move].every((historyMove) =>
      isCarefulEligibleMove(historyMove, finishPosition),
    ) &&
    !playerHasBonus(player, journeyAchievements.CAREFUL.name)
  ) {
    achievementMoves.push(journeyAchievements.CAREFUL);
  }

  if (
    player.movesHistory.length >= nonJackpotPrizes.length - 1 &&
    !playerHasBonus(player, journeyAchievements.COLLECTOR.name)
  ) {
    const historyWithCurrentMove = [...player.movesHistory, { cell: move.cell }];
    const hasAllPrizeTypes = nonJackpotPrizes.every((prize) =>
      historyWithCurrentMove.some((historyMove) => historyMove.cell && historyMove.cell.prize === prize),
    );

    if (hasAllPrizeTypes) {
      achievementMoves.push(journeyAchievements.COLLECTOR);
    }
  }

  if (
    player.movesHistory.length >= 4 &&
    player.movesHistory.slice(-4).every((historyMove) => historyMove.cell && historyMove.cell.prize > 0) &&
    isPositiveRewardMove(move) &&
    !playerHasBonus(player, journeyAchievements.LUCKY.name)
  ) {
    achievementMoves.push(journeyAchievements.LUCKY);
  }

  return achievementMoves.map((achievement) => ({
    type: MOVE_TYPES.ACHIEVEMENT,
    playerId: player.id,
    playerNickname: player.nickname,
    achievement,
  }));
}

function applyMoveToPlayer(player: JourneyPlayer, move: JourneyMove, finishPosition: number) {
  player.previousPosition = player.position;
  player.previousPrize = player.prize;
  player.position = move.currentPosition;
  player.prize = move.prize;
  player.movesHistory.push({
    position: move.currentPosition,
    cell: move.cell ? clone(move.cell) : null,
    type: move.type,
  });
  player.status = getPlayerStatus(player, finishPosition);
}

function getPlayerFullPrize(player: JourneyPlayer): number {
  return player.prize + player.bonuses.reduce((sum, bonus) => sum + bonus.prize, 0);
}

function buildRoundEntry({
  playerBeforeRound,
  playerAfterRound,
  move,
  skipped,
  achievementsAwarded = [],
  roundCreatedAt,
}: {
  playerBeforeRound: JourneyPlayer;
  playerAfterRound: JourneyPlayer;
  move?: JourneyMove;
  skipped: boolean;
  achievementsAwarded?: JourneyAchievement[];
  roundCreatedAt: string;
}): JourneyRoundEntry {
  return {
    createdAt: roundCreatedAt,
    playerId: playerAfterRound.id,
    nickname: playerAfterRound.nickname,
    playerStatusBeforeRound: playerBeforeRound.status,
    playerStatusAfterRound: playerAfterRound.status,
    skipped,
    dice: skipped ? null : (move?.dice ?? null),
    previousPosition: skipped ? playerBeforeRound.position : (move?.previousPosition ?? null),
    currentPosition: skipped ? playerAfterRound.position : (move?.currentPosition ?? null),
    previousPrize: skipped ? playerBeforeRound.prize : (move?.previousPrize ?? null),
    prizeAfterMove: skipped ? playerAfterRound.prize : (move?.prize ?? null),
    fullPrizeAfterRound: getPlayerFullPrize(playerAfterRound),
    moveType: skipped ? "skipped" : (move?.type ?? null),
    cell: skipped ? null : clone(move?.cell ?? null),
    achievementsAwarded: achievementsAwarded.map((achievement) => clone(achievement)),
    bonusesSnapshot: clone(playerAfterRound.bonuses),
  };
}

function createEntriesFromLegacyRound(
  round: JourneyRound,
  playersByNickname: Record<string, JourneyPlayer>,
  fallbackCreatedAt: string,
): JourneyRoundEntry[] {
  const movesByNickname: Record<string, JourneyMove> = round.movesByNickname ?? {};
  const achievementMovesByNickname = (round.achievementMoves ?? []).reduce<Record<string, JourneyAchievement[]>>(
    (accumulator, achievementMove) => {
      if (!accumulator[achievementMove.playerNickname]) {
        accumulator[achievementMove.playerNickname] = [];
      }

      accumulator[achievementMove.playerNickname].push(clone(achievementMove.achievement));
      return accumulator;
    },
    {},
  );

  const moveEntries = Object.values(movesByNickname).map((move) => {
    const player = playersByNickname[move.playerNickname];

    return {
      createdAt: round.createdAt ?? fallbackCreatedAt,
      playerId: player?.id ?? null,
      nickname: move.playerNickname,
      playerStatusBeforeRound: null,
      playerStatusAfterRound: player?.status ?? null,
      skipped: false,
      dice: move.dice ?? null,
      previousPosition: move.previousPosition ?? null,
      currentPosition: move.currentPosition ?? null,
      previousPrize: move.previousPrize ?? null,
      prizeAfterMove: move.prize ?? null,
      fullPrizeAfterRound: player ? getPlayerFullPrize(player) : null,
      moveType: (move.type as JourneyMoveType | null) ?? null,
      cell: move.cell ? clone(move.cell) : null,
      achievementsAwarded: (achievementMovesByNickname[move.playerNickname] ?? []).map((achievement) =>
        clone(achievement),
      ),
      bonusesSnapshot: player ? clone(player.bonuses) : [],
    };
  });

  const skippedEntries = (round.skippedNicknames ?? []).map((nickname) => {
    const player = playersByNickname[nickname];

    return {
      createdAt: round.createdAt ?? fallbackCreatedAt,
      playerId: player?.id ?? null,
      nickname,
      playerStatusBeforeRound: player?.status ?? null,
      playerStatusAfterRound: player?.status ?? null,
      skipped: true,
      dice: null,
      previousPosition: player?.position ?? null,
      currentPosition: player?.position ?? null,
      previousPrize: player?.prize ?? null,
      prizeAfterMove: player?.prize ?? null,
      fullPrizeAfterRound: player ? getPlayerFullPrize(player) : null,
      moveType: "skipped" as const,
      cell: null,
      achievementsAwarded: [],
      bonusesSnapshot: player ? clone(player.bonuses) : [],
    };
  });

  return [...moveEntries, ...skippedEntries];
}

export function normalizeJourneyGame(rawGame: JourneyGame | null): JourneyGame | null {
  if (!rawGame) {
    return null;
  }

  const game = clone(rawGame);
  game.createdAt = game.createdAt ?? getNowIso();
  game.updatedAt = game.updatedAt ?? game.createdAt;
  game.status = game.status ?? "in_progress";
  game.rulesetId = game.rulesetId ?? DEFAULT_JOURNEY_RULESET.id;
  game.rulesetName = game.rulesetName ?? DEFAULT_JOURNEY_RULESET.name;
  game.rules = getGameRules(game);
  game.map = game.map ?? {};
  game.comments = game.comments ?? [];
  game.rounds = game.rounds ?? [];

  const { initialPrize, finishPosition } = getJourneyConfig(game.rules);

  game.players = (game.players ?? []).map((player, index) => ({
    id: player.id ?? generatePlayerId(player.nickname ?? `player-${index + 1}`),
    nickname: player.nickname,
    status: player.status ?? getPlayerStatus(player, finishPosition),
    removedAt: player.removedAt ?? null,
    removedReason: player.removedReason ?? null,
    position: player.position ?? 0,
    previousPosition: player.previousPosition ?? 0,
    previousPrize: player.previousPrize ?? initialPrize,
    prize: player.prize ?? initialPrize,
    bonuses: clone(player.bonuses ?? []),
    movesHistory: clone(player.movesHistory ?? []),
  }));

  refreshGameIndexes(game, false);

  const playersByNickname = game.players.reduce<Record<string, JourneyPlayer>>((accumulator, player) => {
    accumulator[player.nickname] = player;
    return accumulator;
  }, {});

  game.rounds = game.rounds.map((round) => ({
    ...round,
    createdAt: round.createdAt ?? game.updatedAt ?? game.createdAt,
    entries:
      round.entries?.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt ?? round.createdAt ?? game.updatedAt ?? game.createdAt,
        playerId: entry.playerId ?? playersByNickname[entry.nickname]?.id ?? null,
        achievementsAwarded: clone(entry.achievementsAwarded ?? []),
        bonusesSnapshot: clone(entry.bonusesSnapshot ?? []),
        cell: entry.cell ? clone(entry.cell) : null,
      })) ?? createEntriesFromLegacyRound(round, playersByNickname, game.updatedAt ?? game.createdAt),
  }));

  game.status = isJourneyGameOver(game) ? "finished" : "in_progress";
  refreshGameIndexes(game, false);
  return game;
}

export function createJourneyGame(
  nicknames: string[],
  {
    randomFn = Math.random,
    rules = oldbk2_rules,
    rulesetId = DEFAULT_JOURNEY_RULESET.id,
    rulesetName = DEFAULT_JOURNEY_RULESET.name,
  }: {
    randomFn?: RandomFn;
    rules?: JourneyRules;
    rulesetId?: JourneyRuleset["id"];
    rulesetName?: JourneyRuleset["name"];
  } = {},
): JourneyGame {
  const createdAt = getNowIso();
  const normalizedRules = normalizeJourneyRules(rules);

  const game: JourneyGame = {
    createdAt,
    updatedAt: createdAt,
    moveIndex: 0,
    status: "in_progress",
    rulesetId,
    rulesetName,
    rules: normalizedRules,
    map: createMap(normalizedRules, randomFn),
    players: [...new Set(nicknames.map((nickname) => nickname.trim()).filter(Boolean))].map((nickname) =>
      createPlayer(nickname, normalizedRules),
    ),
    playersById: {},
    rounds: [],
    comments: [],
  };

  return refreshGameIndexes(game, false);
}

export function isJourneyGameOver(game: JourneyGame): boolean {
  return getJourneyActivePlayers(game).length === 0;
}

export function getJourneyFinishedPlayers(game: JourneyGame): JourneyPlayer[] {
  return game.players.filter((player) => player.status === "finished");
}

export function getJourneyActivePlayers(game: JourneyGame): JourneyPlayer[] {
  return game.players.filter((player) => player.status === "active");
}

export function getJourneyVisiblePlayers(game: JourneyGame): JourneyPlayer[] {
  return game.players.filter((player) => player.status !== "removed");
}

export function getJourneyPlayerFullPrize(player: JourneyPlayer): number {
  return getPlayerFullPrize(player);
}

export function getJourneyResults(game: JourneyGame): Array<JourneyPlayer & { fullPrize: number }> {
  return [...game.players]
    .filter((player) => player.status !== "removed")
    .map((player) => ({
      ...player,
      fullPrize: getPlayerFullPrize(player),
    }))
    .sort((left, right) => right.fullPrize - left.fullPrize);
}

export function calculateReceiptsDistribution(game: JourneyGame): Record<number, number> {
  const receiptTypes = [200, 100, 50, 20, 10, 5, 1] as const;
  const result: Record<number, number> = {
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  };

  getJourneyResults(game).forEach((player) => {
    let amount = player.fullPrize;

    receiptTypes.forEach((receipt) => {
      while (amount - receipt >= 0) {
        result[receipt] += 1;
        amount -= receipt;
      }
    });
  });

  return result;
}

function hasJourneyFinalSummary(game: JourneyGame): boolean {
  return (game.comments ?? []).some((comment) => comment === "==================== Итоги ====================");
}

function appendJourneyFinalSummary(game: JourneyGame): JourneyGame {
  if (hasJourneyFinalSummary(game)) {
    return game;
  }

  const results = getJourneyResults(game);
  const receipts = calculateReceiptsDistribution(game);
  const { currency } = getJourneyConfig(getGameRules(game));

  const finalComments = [
    "==================== Итоги ====================",
    ...results.map(
      (player, index) =>
        `${index + 1}. ${player.nickname} — ${player.fullPrize} ${currency} (база: ${player.prize}, бонусы: ${
          player.fullPrize - player.prize
        })`,
    ),
    `Финишировали: ${getJourneyFinishedPlayers(game).length}`,
    `Размен чеков: ${Object.entries(receipts)
      .map(([amount, count]) => `${amount}: ${count}`)
      .join(", ")}`,
  ];

  game.comments.push(...finalComments);
  return game;
}

export function removeJourneyPlayer(game: JourneyGame, playerId: string): JourneyGame {
  const nextGame = clone(game);
  nextGame.rules = getGameRules(nextGame);

  const player = getPlayerById(nextGame, playerId);

  if (!player || player.status === "removed") {
    return nextGame;
  }

  const nickname = player.nickname;

  player.status = "removed";
  player.removedAt = getNowIso();
  player.removedReason = "manual";
  nextGame.comments = [...nextGame.comments, `Игрок ${nickname} удалён из текущей партии.`];

  if (isJourneyGameOver(nextGame)) {
    nextGame.status = "finished";
    appendJourneyFinalSummary(nextGame);
  }

  return refreshGameIndexes(nextGame);
}

export function makeJourneyRound(
  game: JourneyGame,
  inputMoves: JourneyMoveInput[],
  skippedPlayerIds: string[] = [],
  randomFn: RandomFn = Math.random,
): JourneyGame {
  const nextGame = clone(game);
  nextGame.rules = getGameRules(nextGame);

  const journeyAchievements = getJourneyAchievements(nextGame.rules);
  const { finishPosition } = getJourneyConfig(nextGame.rules);
  const activePlayers = getJourneyActivePlayers(nextGame);

  if (!activePlayers.length) {
    nextGame.status = "finished";
    appendJourneyFinalSummary(nextGame);
    return nextGame;
  }

  nextGame.moveIndex += 1;
  const roundCreatedAt = getNowIso();
  const movesByPlayerId: JourneyMovesByPlayerId = {};
  const playersBeforeRoundById = indexPlayersById(activePlayers.map((player) => clone(player)));

  inputMoves.forEach(({ playerId, dice }: JourneyMoveInput) => {
    const player = getPlayerById(nextGame, playerId);

    if (!player || player.status !== "active") {
      return;
    }

    const move = buildMove(player, dice, nextGame.map, nextGame.rules);

    if (move) {
      movesByPlayerId[playerId] = move;
    }
  });

  applyJackpots(nextGame, movesByPlayerId, nextGame.rules, randomFn);

  const achievementMoves: JourneyAchievementMove[] = [];

  Object.values(movesByPlayerId).forEach((move) => {
    const player = getPlayerById(nextGame, move.playerId);
    if (!player) {
      return;
    }

    achievementMoves.push(...getAchievementMovesForPlayer(player, move, nextGame.rules));
  });

  const achievementMovesByPlayerId = achievementMoves.reduce<JourneyAchievementsByPlayerId>(
    (accumulator, achievementMove) => {
      if (!accumulator[achievementMove.playerId]) {
        accumulator[achievementMove.playerId] = [];
      }

      accumulator[achievementMove.playerId].push(clone(achievementMove.achievement));
      return accumulator;
    },
    {},
  );

  Object.values(movesByPlayerId).forEach((move) => {
    const player = getPlayerById(nextGame, move.playerId);
    if (!player) {
      return;
    }

    applyMoveToPlayer(player, move, finishPosition);

    if (move.type === MOVE_TYPES.JACKPOT) {
      player.bonuses.push(clone(journeyAchievements.JACKPOT));
    }

    achievementMoves
      .filter((achievementMove) => achievementMove.playerId === player.id)
      .forEach((achievementMove) => {
        player.bonuses.push(clone(achievementMove.achievement));
      });
  });

  const roundEntries = activePlayers.map((playerBeforeRound) => {
    const playerAfterRound = getPlayerById(nextGame, playerBeforeRound.id);
    const move = movesByPlayerId[playerBeforeRound.id];
    const skipped = skippedPlayerIds.includes(playerBeforeRound.id);

    return buildRoundEntry({
      playerBeforeRound: playersBeforeRoundById[playerBeforeRound.id] ?? playerBeforeRound,
      playerAfterRound: playerAfterRound ?? playerBeforeRound,
      move,
      skipped,
      achievementsAwarded: achievementMovesByPlayerId[playerBeforeRound.id] ?? [],
      roundCreatedAt,
    });
  });

  const roundComments: string[] = [buildRoundHeader(nextGame.moveIndex)];

  Object.values(movesByPlayerId).forEach((move) => {
    const player = getPlayerById(nextGame, move.playerId);

    if (player) {
      roundComments.push(buildJourneyComment({ move, player, rules: nextGame.rules, randomFn }));
    }
  });

  achievementMoves.forEach((achievementMove) => {
    const player = getPlayerById(nextGame, achievementMove.playerId);

    if (player) {
      roundComments.push(
        buildJourneyComment({
          achievement: achievementMove.achievement,
          player,
          rules: nextGame.rules,
          randomFn,
        }),
      );
    }
  });

  const skippedNicknames = skippedPlayerIds
    .map((playerId) => getPlayerById(nextGame, playerId)?.nickname)
    .filter((nickname): nickname is string => Boolean(nickname));

  const movesByNickname = Object.values(movesByPlayerId).reduce<Record<string, JourneyMove>>((accumulator, move) => {
    accumulator[move.playerNickname] = move;
    return accumulator;
  }, {});

  skippedNicknames.forEach((nickname) => {
    roundComments.push(`${nickname} пропускает ход`);
  });

  nextGame.rounds.push({
    moveIndex: nextGame.moveIndex,
    createdAt: roundCreatedAt,
    entries: roundEntries,
    movesByPlayerId,
    movesByNickname,
    achievementMoves,
    skippedPlayerIds,
    skippedNicknames,
  });
  nextGame.comments.push(...roundComments);

  if (isJourneyGameOver(nextGame)) {
    nextGame.status = "finished";
    appendJourneyFinalSummary(nextGame);
  }

  return refreshGameIndexes(nextGame);
}

export function getJourneyMapCell(index: number, gameMap: Record<number, JourneyMapCell>): JourneyMapCell | null {
  return gameMap[index] ?? null;
}

export function getJourneyCellLabel(cell: JourneyMapCell | null): string {
  if (!cell) {
    return "Пусто";
  }

  if (cell.isJackpot) {
    return "Сокровище";
  }

  if (cell.prize > 0) {
    return `Бонус +${cell.prize}`;
  }

  return `Ловушка ${cell.prize}`;
}

export function getJourneyMoveTypeLabel(type: JourneyMoveType | null): string {
  switch (type) {
    case MOVE_TYPES.JACKPOT:
      return "Сокровище";
    case MOVE_TYPES.EMPTY_JACKPOT:
      return "Пустой сундук";
    case MOVE_TYPES.INCREASE:
      return "Бонус";
    case MOVE_TYPES.DECREASE:
      return "Ловушка";
    case MOVE_TYPES.TO_MAX:
    case MOVE_TYPES.AT_MAX:
      return "Лимит";
    case MOVE_TYPES.TO_ZERO:
    case MOVE_TYPES.AT_ZERO:
      return "Обнуление";
    case MOVE_TYPES.FINISH:
      return "Финиш";
    default:
      return "Пусто";
  }
}

export function getAchievementMetadata(name: string, rules: JourneyRules = oldbk2_rules): JourneyAchievement | null {
  return getAchievementBonus(name, rules);
}

export function getJourneyPlayerTimeline(game: JourneyGame, playerIdOrNickname: string): JourneyRoundEntry[] {
  return (game.rounds ?? []).flatMap((round) =>
    (round.entries ?? []).filter(
      (entry) => entry.playerId === playerIdOrNickname || entry.nickname === playerIdOrNickname,
    ),
  );
}
