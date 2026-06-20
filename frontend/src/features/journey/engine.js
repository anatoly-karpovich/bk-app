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

function clone(value) {
  return structuredClone(value);
}

function getNowIso() {
  return new Date().toISOString();
}

function getGameRules(game) {
  return normalizeJourneyRules(game?.rules ?? oldbk2_rules);
}

function generatePlayerId(nickname = "player") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${nickname}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomInteger(min, max, randomFn = Math.random) {
  return Math.floor(randomFn() * (max - min + 1)) + min;
}

function getPlayerByNickname(game, nickname) {
  return game.players.find((player) => player.nickname === nickname);
}

function getPlayerById(game, playerId) {
  return game.players.find((player) => player.id === playerId);
}

function playerHasBonus(player, bonusName) {
  return player.bonuses.some((bonus) => bonus.name === bonusName);
}

function getAchievementBonus(name, rules = oldbk2_rules) {
  return Object.values(getJourneyAchievements(rules)).find((achievement) => achievement.name === name) ?? null;
}

function buildRoundHeader(moveIndex) {
  return `==================== Ход ${moveIndex} ====================`;
}

function isTrapMove(move) {
  return Boolean(move.cell && move.cell.prize < 0);
}

function isPositiveRewardMove(move) {
  return Boolean(move.cell && move.cell.prize > 0);
}

function getPlayerStatus(player, finishPosition) {
  if (player.removedAt || player.status === "removed") {
    return "removed";
  }

  if (player.position === finishPosition) {
    return "finished";
  }

  return "active";
}

function indexPlayersById(players) {
  return players.reduce((accumulator, player) => {
    accumulator[player.id] = player;
    return accumulator;
  }, {});
}

function refreshGameIndexes(game, updateTimestamp = true) {
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

function isCarefulEligibleMove(move, finishPosition) {
  if (move.currentPosition === finishPosition || move.type === MOVE_TYPES.JACKPOT) {
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

function createPlayer(nickname, rules) {
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

function createMap(rules, randomFn = Math.random) {
  const { mapSize } = getJourneyConfig(rules);
  const availableCells = Array.from({ length: mapSize }, (_, index) => index + 1);
  const gameMap = {};

  getJourneyBonusCells(rules).forEach(({ cell, amount }) => {
    for (let index = 0; index < amount; index += 1) {
      const randomCellIndex = randomInteger(0, availableCells.length - 1, randomFn);
      const [position] = availableCells.splice(randomCellIndex, 1);
      gameMap[position] = clone(cell);
    }
  });

  return gameMap;
}

function buildMove(player, dice, gameMap, rules) {
  const journeyConfig = getJourneyConfig(rules);
  const hasPrizeLimit = Number.isFinite(journeyConfig.maxPrize);

  if (player.position === journeyConfig.finishPosition) {
    return null;
  }

  const currentPosition = Math.min(player.position + dice, journeyConfig.finishPosition);
  const cell = gameMap[currentPosition] ? clone(gameMap[currentPosition]) : null;
  let prize = player.prize;
  let type = MOVE_TYPES.EMPTY;

  if (cell && cell.prize) {
    if (hasPrizeLimit && prize < journeyConfig.maxPrize && prize + cell.prize > journeyConfig.maxPrize) {
      prize = journeyConfig.maxPrize;
      type = MOVE_TYPES.TO_MAX;
    } else if (hasPrizeLimit && prize + cell.prize > journeyConfig.maxPrize) {
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

function applyJackpots(game, movesByNickname, rules, randomFn = Math.random) {
  const journeyAchievements = getJourneyAchievements(rules);
  const jackpotCells = Object.entries(game.map).filter(([, cell]) => cell.isJackpot);

  jackpotCells.forEach(([position, cell]) => {
    const movesOnCell = Object.values(movesByNickname).filter((move) => move.currentPosition === Number(position));

    if (!movesOnCell.length) {
      return;
    }

    if (!cell.winner) {
      const eligiblePlayers = movesOnCell
        .map((move) => getPlayerByNickname(game, move.playerNickname))
        .filter((player) => player && !playerHasBonus(player, journeyAchievements.JACKPOT.name));

      if (eligiblePlayers.length) {
        const winner = eligiblePlayers[randomInteger(0, eligiblePlayers.length - 1, randomFn)];
        game.map[position].winner = { nickname: winner.nickname };
        movesByNickname[winner.nickname].type = MOVE_TYPES.JACKPOT;
      }
    }

    if (!game.map[position].winner) {
      return;
    }

    movesOnCell
      .filter((move) => move.playerNickname !== game.map[position].winner.nickname)
      .forEach((move) => {
        move.type = MOVE_TYPES.EMPTY_JACKPOT;
      });
  });
}

function getAchievementMovesForPlayer(player, move, rules) {
  const journeyAchievements = getJourneyAchievements(rules);
  const nonJackpotPrizes = getNonJackpotPrizes(rules);
  const { finishPosition } = getJourneyConfig(rules);
  const achievementMoves = [];

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
    playerNickname: player.nickname,
    achievement,
  }));
}

function applyMoveToPlayer(player, move, finishPosition) {
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

function getPlayerFullPrize(player) {
  return player.prize + player.bonuses.reduce((sum, bonus) => sum + bonus.prize, 0);
}

function buildRoundEntry({
  playerBeforeRound,
  playerAfterRound,
  move,
  skipped,
  achievementsAwarded = [],
  roundCreatedAt,
}) {
  return {
    createdAt: roundCreatedAt,
    playerId: playerAfterRound.id,
    nickname: playerAfterRound.nickname,
    playerStatusBeforeRound: playerBeforeRound.status,
    playerStatusAfterRound: playerAfterRound.status,
    skipped,
    dice: skipped ? null : move.dice,
    previousPosition: skipped ? playerBeforeRound.position : move.previousPosition,
    currentPosition: skipped ? playerAfterRound.position : move.currentPosition,
    previousPrize: skipped ? playerBeforeRound.prize : move.previousPrize,
    prizeAfterMove: skipped ? playerAfterRound.prize : move.prize,
    fullPrizeAfterRound: getPlayerFullPrize(playerAfterRound),
    moveType: skipped ? "skipped" : move.type,
    cell: skipped ? null : clone(move.cell),
    achievementsAwarded: achievementsAwarded.map((achievement) => clone(achievement)),
    bonusesSnapshot: clone(playerAfterRound.bonuses),
  };
}

function createEntriesFromLegacyRound(round, playersByNickname, fallbackCreatedAt) {
  const movesByNickname = round.movesByNickname ?? {};
  const achievementMovesByNickname = (round.achievementMoves ?? []).reduce((accumulator, achievementMove) => {
    if (!accumulator[achievementMove.playerNickname]) {
      accumulator[achievementMove.playerNickname] = [];
    }

    accumulator[achievementMove.playerNickname].push(clone(achievementMove.achievement));
    return accumulator;
  }, {});

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
      moveType: move.type ?? null,
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
      moveType: "skipped",
      cell: null,
      achievementsAwarded: [],
      bonusesSnapshot: player ? clone(player.bonuses) : [],
    };
  });

  return [...moveEntries, ...skippedEntries];
}

export function normalizeJourneyGame(rawGame) {
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

  const playersByNickname = game.players.reduce((accumulator, player) => {
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
  nicknames,
  {
    randomFn = Math.random,
    rules = oldbk2_rules,
    rulesetId = DEFAULT_JOURNEY_RULESET.id,
    rulesetName = DEFAULT_JOURNEY_RULESET.name,
  } = {},
) {
  const createdAt = getNowIso();
  const normalizedRules = normalizeJourneyRules(rules);

  const game = {
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

export function isJourneyGameOver(game) {
  return getJourneyActivePlayers(game).length === 0;
}

export function getJourneyFinishedPlayers(game) {
  return game.players.filter((player) => player.status === "finished");
}

export function getJourneyActivePlayers(game) {
  return game.players.filter((player) => player.status === "active");
}

export function getJourneyVisiblePlayers(game) {
  return game.players.filter((player) => player.status !== "removed");
}

export function getJourneyPlayerFullPrize(player) {
  return getPlayerFullPrize(player);
}

export function getJourneyResults(game) {
  return [...game.players]
    .filter((player) => player.status !== "removed")
    .map((player) => ({
      ...player,
      fullPrize: getPlayerFullPrize(player),
    }))
    .sort((left, right) => right.fullPrize - left.fullPrize);
}

export function calculateReceiptsDistribution(game) {
  const result = {
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

    [200, 100, 50, 20, 10, 5, 1].forEach((receipt) => {
      while (amount - receipt >= 0) {
        result[receipt] += 1;
        amount -= receipt;
      }
    });
  });

  return result;
}

function hasJourneyFinalSummary(game) {
  return (game.comments ?? []).some((comment) => comment === "==================== Итоги ====================");
}

function appendJourneyFinalSummary(game) {
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

export function removeJourneyPlayer(game, nickname) {
  const nextGame = clone(game);
  nextGame.rules = getGameRules(nextGame);

  const player = getPlayerByNickname(nextGame, nickname);

  if (!player || player.status === "removed") {
    return nextGame;
  }

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

export function makeJourneyRound(game, inputMoves, skippedNicknames = [], randomFn = Math.random) {
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
  const movesByNickname = {};
  const playersBeforeRoundById = indexPlayersById(activePlayers.map((player) => clone(player)));

  inputMoves.forEach(({ nickname, dice }) => {
    const player = getPlayerByNickname(nextGame, nickname);

    if (!player || player.status !== "active") {
      return;
    }

    const move = buildMove(player, dice, nextGame.map, nextGame.rules);

    if (move) {
      movesByNickname[nickname] = move;
    }
  });

  applyJackpots(nextGame, movesByNickname, nextGame.rules, randomFn);

  const achievementMoves = [];

  Object.values(movesByNickname).forEach((move) => {
    const player = getPlayerByNickname(nextGame, move.playerNickname);
    achievementMoves.push(...getAchievementMovesForPlayer(player, move, nextGame.rules));
  });

  const achievementMovesByNickname = achievementMoves.reduce((accumulator, achievementMove) => {
    if (!accumulator[achievementMove.playerNickname]) {
      accumulator[achievementMove.playerNickname] = [];
    }

    accumulator[achievementMove.playerNickname].push(clone(achievementMove.achievement));
    return accumulator;
  }, {});

  Object.values(movesByNickname).forEach((move) => {
    const player = getPlayerByNickname(nextGame, move.playerNickname);
    applyMoveToPlayer(player, move, finishPosition);

    if (move.type === MOVE_TYPES.JACKPOT) {
      player.bonuses.push(clone(journeyAchievements.JACKPOT));
    }

    achievementMoves
      .filter((achievementMove) => achievementMove.playerNickname === player.nickname)
      .forEach((achievementMove) => {
        player.bonuses.push(clone(achievementMove.achievement));
      });
  });

  const roundEntries = activePlayers.map((playerBeforeRound) => {
    const playerAfterRound = getPlayerById(nextGame, playerBeforeRound.id);
    const move = movesByNickname[playerBeforeRound.nickname];
    const skipped = skippedNicknames.includes(playerBeforeRound.nickname);

    return buildRoundEntry({
      playerBeforeRound: playersBeforeRoundById[playerBeforeRound.id] ?? playerBeforeRound,
      playerAfterRound,
      move,
      skipped,
      achievementsAwarded: achievementMovesByNickname[playerBeforeRound.nickname] ?? [],
      roundCreatedAt,
    });
  });

  const roundComments = [buildRoundHeader(nextGame.moveIndex)];

  Object.values(movesByNickname).forEach((move) => {
    const player = getPlayerByNickname(nextGame, move.playerNickname);
    roundComments.push(buildJourneyComment({ move, player, rules: nextGame.rules, randomFn }));
  });

  achievementMoves.forEach((achievementMove) => {
    const player = getPlayerByNickname(nextGame, achievementMove.playerNickname);
    roundComments.push(
      buildJourneyComment({
        achievement: achievementMove.achievement,
        player,
        rules: nextGame.rules,
        randomFn,
      }),
    );
  });

  skippedNicknames.forEach((nickname) => {
    roundComments.push(`${nickname} пропускает ход`);
  });

  nextGame.rounds.push({
    moveIndex: nextGame.moveIndex,
    createdAt: roundCreatedAt,
    entries: roundEntries,
    movesByNickname,
    achievementMoves,
    skippedNicknames,
  });
  nextGame.comments.push(...roundComments);

  if (isJourneyGameOver(nextGame)) {
    nextGame.status = "finished";
    appendJourneyFinalSummary(nextGame);
  }

  return refreshGameIndexes(nextGame);
}

export function getJourneyMapCell(index, gameMap) {
  return gameMap[index] ?? null;
}

export function getJourneyCellLabel(cell) {
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

export function getJourneyMoveTypeLabel(type) {
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

export function getAchievementMetadata(name, rules = oldbk2_rules) {
  return getAchievementBonus(name, rules);
}

export function getJourneyPlayerTimeline(game, playerIdOrNickname) {
  return (game.rounds ?? []).flatMap((round) =>
    (round.entries ?? []).filter(
      (entry) => entry.playerId === playerIdOrNickname || entry.nickname === playerIdOrNickname,
    ),
  );
}
