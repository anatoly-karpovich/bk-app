import type { CurrencySnapshot as ConfigCurrency } from "../../../common/currency";
import {
  applyJourneyRewardsToBalance,
  balanceToJourneyCurrencyValues,
  createJourneyBalance,
  formatJourneyCurrencyValues,
  hasNegativeJourneyRewards,
  hasPositiveJourneyRewards,
  normalizeJourneyBalance,
  normalizeJourneyCurrencyValues,
} from "./currency";
import {
  DEFAULT_JOURNEY_RULES,
  getCollectibleJourneyCells,
  getJourneyAchievements,
  getJourneyBonusCells,
  getJourneyConfig,
  MOVE_TYPES,
  normalizeJourneyRules,
} from "./config";
import { buildJourneyComment } from "./commentTemplates";
import type {
  JourneyAchievement,
  JourneyAchievementMove,
  JourneyAchievementsByPlayerId,
  JourneyBalance,
  JourneyCurrencyValue,
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
  JourneyRulesCell,
  JourneyTimelineEntry,
  RandomFn,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getNowIso(): string {
  return new Date().toISOString();
}

function failJourneyRoundValidation(message: string): never {
  throw new Error(`Journey round validation failed: ${message}`);
}

function createDefaultJourneyCurrency(label = "фишек"): ConfigCurrency {
  return {
    id: "default",
    label,
  };
}

function getGameCurrencies(game: JourneyGame | null | undefined): ConfigCurrency[] {
  return game?.currencies?.length ? clone(game.currencies) : [createDefaultJourneyCurrency()];
}

function getGameRules(game: JourneyGame | null | undefined): JourneyRules {
  return normalizeJourneyRules(game?.rules ?? DEFAULT_JOURNEY_RULES);
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

function getAchievementBonus(name: string, rules: JourneyRules = DEFAULT_JOURNEY_RULES): JourneyAchievement | null {
  return Object.values(getJourneyAchievements(rules)).find((achievement) => achievement.name === name) ?? null;
}

function buildRoundHeader(moveIndex: number): string {
  return `==================== Ход ${moveIndex} ====================`;
}

function isTrapMove(move: { cell: JourneyMapCell | null }): boolean {
  return Boolean(move.cell && hasNegativeJourneyRewards(move.cell.rewards));
}

function isPositiveRewardMove(move: { cell: JourneyMapCell | null }): boolean {
  return Boolean(move.cell && hasPositiveJourneyRewards(move.cell.rewards));
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
  const { finishPosition } = getJourneyConfig(getGameRules(game), getGameCurrencies(game));

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

  return move.cell.rewards.length === 0;
}

function createPlayer(nickname: string, rules: JourneyRules, currencies: ConfigCurrency[]): JourneyPlayer {
  const { initialRewards } = getJourneyConfig(rules, currencies);
  const balance = createJourneyBalance(currencies, initialRewards);

  return {
    id: generatePlayerId(nickname),
    nickname,
    status: "active",
    removedAt: null,
    removedReason: null,
    position: 0,
    previousBalance: clone(balance),
    balance,
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

function resolveMoveType(params: {
  requestedRewards: JourneyCurrencyValue[];
  appliedRewards: JourneyCurrencyValue[];
  hasAnyCappedPositiveReward: boolean;
  hasAnyBlockedPositiveReward: boolean;
  hasAnyFlooredNegativeReward: boolean;
  hasAnyBlockedNegativeReward: boolean;
}): JourneyMoveType {
  const {
    requestedRewards,
    appliedRewards,
    hasAnyCappedPositiveReward,
    hasAnyBlockedPositiveReward,
    hasAnyFlooredNegativeReward,
    hasAnyBlockedNegativeReward,
  } = params;

  if (!requestedRewards.length) {
    return MOVE_TYPES.EMPTY;
  }

  if (hasPositiveJourneyRewards(requestedRewards)) {
    if (appliedRewards.every((reward) => reward.value === 0)) {
      return MOVE_TYPES.AT_MAX;
    }

    if (hasAnyCappedPositiveReward || hasAnyBlockedPositiveReward) {
      return MOVE_TYPES.TO_MAX;
    }

    return MOVE_TYPES.INCREASE;
  }

  if (appliedRewards.every((reward) => reward.value === 0)) {
    return MOVE_TYPES.AT_ZERO;
  }

  if (hasAnyFlooredNegativeReward || hasAnyBlockedNegativeReward) {
    return MOVE_TYPES.TO_ZERO;
  }

  return MOVE_TYPES.DECREASE;
}

function buildMove(
  player: JourneyPlayer,
  dice: number,
  gameMap: Record<number, JourneyMapCell>,
  rules: JourneyRules,
  currencies: ConfigCurrency[],
): JourneyMove | null {
  const journeyConfig = getJourneyConfig(rules, currencies);

  if (player.position === journeyConfig.finishPosition) {
    return null;
  }

  const currentPosition = Math.min(player.position + dice, journeyConfig.finishPosition);
  const cell = gameMap[currentPosition] ? clone(gameMap[currentPosition]) : null;
  const requestedRewards = cell && !cell.isJackpot ? clone(cell.rewards) : [];
  const rewardApplication = applyJourneyRewardsToBalance({
    balance: player.balance,
    rewards: requestedRewards,
    currencies,
    maxPrizes: journeyConfig.maxPrizes,
  });

  let type = resolveMoveType({
    requestedRewards,
    appliedRewards: rewardApplication.appliedRewards,
    hasAnyCappedPositiveReward: rewardApplication.hasAnyCappedPositiveReward,
    hasAnyBlockedPositiveReward: rewardApplication.hasAnyBlockedPositiveReward,
    hasAnyFlooredNegativeReward: rewardApplication.hasAnyFlooredNegativeReward,
    hasAnyBlockedNegativeReward: rewardApplication.hasAnyBlockedNegativeReward,
  });

  if (currentPosition === journeyConfig.finishPosition) {
    type = MOVE_TYPES.FINISH;
  }

  return {
    playerId: player.id,
    playerNickname: player.nickname,
    dice,
    previousPosition: player.position,
    previousBalance: clone(player.balance),
    currentPosition,
    balanceAfterMove: rewardApplication.nextBalance,
    requestedRewards,
    appliedRewards: rewardApplication.appliedRewards,
    cell,
    type,
  };
}

function validateJourneyRoundInput(
  game: JourneyGame,
  activePlayers: JourneyPlayer[],
  inputMoves: JourneyMoveInput[],
  skippedPlayerIds: string[],
) {
  const { minDice, maxDice } = getJourneyConfig(game.rules, game.currencies);
  const activePlayersById = indexPlayersById(activePlayers);
  const movePlayerIds = new Set<string>();
  const skippedPlayerIdSet = new Set<string>();

  inputMoves.forEach(({ playerId, dice }) => {
    const player = activePlayersById[playerId];

    if (!player) {
      failJourneyRoundValidation(`Player '${playerId}' is not active in the current round`);
    }

    if (!Number.isInteger(dice)) {
      failJourneyRoundValidation(`Dice value for player '${player.nickname}' must be an integer`);
    }

    if (dice < minDice || dice > maxDice) {
      failJourneyRoundValidation(
        `Dice value for player '${player.nickname}' must be between ${minDice} and ${maxDice}`,
      );
    }

    if (movePlayerIds.has(playerId)) {
      failJourneyRoundValidation(`Player '${player.nickname}' has more than one submitted move`);
    }

    movePlayerIds.add(playerId);
  });

  skippedPlayerIds.forEach((playerId) => {
    const player = activePlayersById[playerId];

    if (!player) {
      failJourneyRoundValidation(`Player '${playerId}' is not active in the current round`);
    }

    if (skippedPlayerIdSet.has(playerId)) {
      failJourneyRoundValidation(`Player '${player.nickname}' is listed as skipped more than once`);
    }

    if (movePlayerIds.has(playerId)) {
      failJourneyRoundValidation(`Player '${player.nickname}' cannot both move and skip in the same round`);
    }

    skippedPlayerIdSet.add(playerId);
  });

  const accountedPlayerIds = new Set([...movePlayerIds, ...skippedPlayerIdSet]);
  const missingPlayers = activePlayers.filter((player) => !accountedPlayerIds.has(player.id));

  if (missingPlayers.length) {
    failJourneyRoundValidation(
      `Round input is incomplete. Missing move or skip decision for: ${missingPlayers
        .map((player) => player.nickname)
        .join(", ")}`,
    );
  }
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
  const collectibleCellIds = getCollectibleJourneyCells(rules).map((cell) => cell.id);
  const { finishPosition } = getJourneyConfig(rules);
  const achievementMoves: JourneyAchievement[] = [];

  if (
    player.movesHistory.length >= 2 &&
    player.movesHistory
      .slice(-2)
      .every((historyMove) => historyMove.cell && hasNegativeJourneyRewards(historyMove.cell.rewards)) &&
    isTrapMove(move) &&
    !playerHasBonus(player, journeyAchievements.UNLUCKY.name)
  ) {
    achievementMoves.push(journeyAchievements.UNLUCKY);
  }

  if (
    player.movesHistory.length >= 3 &&
    [...player.movesHistory.slice(-3), move].every((historyMove) =>
      isCarefulEligibleMove(historyMove, finishPosition),
    ) &&
    !playerHasBonus(player, journeyAchievements.CAREFUL.name)
  ) {
    achievementMoves.push(journeyAchievements.CAREFUL);
  }

  if (
    player.movesHistory.length >= collectibleCellIds.length - 1 &&
    !playerHasBonus(player, journeyAchievements.COLLECTOR.name)
  ) {
    const historyWithCurrentMove = [...player.movesHistory, { cell: move.cell }];
    const hasAllCellTypes = collectibleCellIds.every((cellId) =>
      historyWithCurrentMove.some(
        (historyMove) => historyMove.cell && !historyMove.cell.isJackpot && historyMove.cell.id === cellId,
      ),
    );

    if (hasAllCellTypes) {
      achievementMoves.push(journeyAchievements.COLLECTOR);
    }
  }

  if (
    player.movesHistory.length >= 4 &&
    player.movesHistory
      .slice(-4)
      .every((historyMove) => historyMove.cell && hasPositiveJourneyRewards(historyMove.cell.rewards)) &&
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
    appliedRewards: [],
  }));
}

function applyMoveToPlayer(player: JourneyPlayer, move: JourneyMove, finishPosition: number) {
  player.previousBalance = clone(player.balance);
  player.position = move.currentPosition;
  player.balance = clone(move.balanceAfterMove);
  player.movesHistory.push({
    position: move.currentPosition,
    cell: move.cell ? clone(move.cell) : null,
    type: move.type,
  });
  player.status = getPlayerStatus(player, finishPosition);
}

function applyBonusRewardsToPlayer(
  player: JourneyPlayer,
  achievement: JourneyAchievement,
  rules: JourneyRules,
  currencies: ConfigCurrency[],
): JourneyCurrencyValue[] {
  const { nextBalance, appliedRewards } = applyJourneyRewardsToBalance({
    balance: player.balance,
    rewards: achievement.rewards,
    currencies,
    maxPrizes: getJourneyConfig(rules, currencies).maxPrizes,
  });

  player.balance = nextBalance;
  return appliedRewards;
}

function buildRoundEntry({
  playerBeforeRound,
  playerAfterRound,
  move,
  skipped,
  achievementsAwarded = [],
  roundCreatedAt,
  currencies,
}: {
  playerBeforeRound: JourneyPlayer;
  playerAfterRound: JourneyPlayer;
  move?: JourneyMove;
  skipped: boolean;
  achievementsAwarded?: JourneyAchievement[];
  roundCreatedAt: string;
  currencies: ConfigCurrency[];
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
    previousBalance: balanceToJourneyCurrencyValues(playerBeforeRound.balance, currencies),
    appliedRewards: skipped ? [] : clone(move?.appliedRewards ?? []),
    balanceAfterMove: skipped
      ? balanceToJourneyCurrencyValues(playerAfterRound.balance, currencies)
      : balanceToJourneyCurrencyValues(move?.balanceAfterMove ?? playerAfterRound.balance, currencies),
    balanceAfterRound: balanceToJourneyCurrencyValues(playerAfterRound.balance, currencies),
    moveType: skipped ? "skipped" : (move?.type ?? null),
    cell: skipped ? null : clone(move?.cell ?? null),
    achievementsAwarded: achievementsAwarded.map((achievement) => clone(achievement)),
    bonusesSnapshot: clone(playerAfterRound.bonuses),
  };
}

function toLegacyJourneyCurrencyValues(value: number | null | undefined, currencyId: string): JourneyCurrencyValue[] {
  return [
    {
      currencyId,
      value: Math.max(0, Math.trunc(value ?? 0)),
    },
  ];
}

function createEntriesFromLegacyRound(
  round: JourneyRound & {
    movesByNickname?: Record<string, JourneyMove & { previousPrize?: number; prize?: number }>;
    skippedNicknames?: string[];
  },
  playersByNickname: Record<string, JourneyPlayer>,
  fallbackCreatedAt: string,
  currencies: ConfigCurrency[],
): JourneyRoundEntry[] {
  const defaultCurrencyId = currencies[0]?.id ?? "default";
  const movesByNickname: Record<string, JourneyMove & { previousPrize?: number; prize?: number }> =
    round.movesByNickname ?? {};
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
      previousBalance: move.previousBalance
        ? balanceToJourneyCurrencyValues(move.previousBalance, currencies)
        : toLegacyJourneyCurrencyValues((move as { previousPrize?: number }).previousPrize, defaultCurrencyId),
      appliedRewards: clone(move.appliedRewards ?? []),
      balanceAfterMove: move.balanceAfterMove
        ? balanceToJourneyCurrencyValues(move.balanceAfterMove, currencies)
        : toLegacyJourneyCurrencyValues((move as { prize?: number }).prize, defaultCurrencyId),
      balanceAfterRound: player ? balanceToJourneyCurrencyValues(player.balance, currencies) : null,
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
      previousBalance: player
        ? balanceToJourneyCurrencyValues(player.balance, currencies)
        : toLegacyJourneyCurrencyValues(0, defaultCurrencyId),
      appliedRewards: [],
      balanceAfterMove: player
        ? balanceToJourneyCurrencyValues(player.balance, currencies)
        : toLegacyJourneyCurrencyValues(0, defaultCurrencyId),
      balanceAfterRound: player
        ? balanceToJourneyCurrencyValues(player.balance, currencies)
        : toLegacyJourneyCurrencyValues(0, defaultCurrencyId),
      moveType: "skipped" as const,
      cell: null,
      achievementsAwarded: [],
      bonusesSnapshot: player ? clone(player.bonuses) : [],
    };
  });

  return [...moveEntries, ...skippedEntries];
}

function migrateLegacyJourneyRules(
  rawRules: Record<string, unknown> | JourneyRules | undefined,
  currencies: ConfigCurrency[],
): JourneyRules {
  const defaultCurrencyId = currencies[0]?.id ?? "default";

  if (!rawRules) {
    return normalizeJourneyRules(DEFAULT_JOURNEY_RULES);
  }

  if ("initialRewards" in rawRules) {
    return normalizeJourneyRules(rawRules as unknown as JourneyRules);
  }

  const legacyRules = rawRules as {
    initialPrize?: number;
    minDice?: number;
    maxDice?: number;
    maxPrize?: number | null;
    mapSize?: number;
    jackpot?: { count?: number; prize?: number };
    cells?: Array<{ id: string; kind: "bonus" | "trap"; value: number; count: number }>;
    achievements?: {
      unlucky?: { prize?: number };
      careful?: { prize?: number };
      collector?: { prize?: number };
      lucky?: { prize?: number };
    };
  };

  return normalizeJourneyRules({
    initialRewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.initialPrize ?? 15) }],
    minDice: legacyRules.minDice,
    maxDice: legacyRules.maxDice,
    maxPrizes:
      legacyRules.maxPrize === null
        ? null
        : [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.maxPrize ?? 30) }],
    mapSize: legacyRules.mapSize,
    jackpot: {
      count: legacyRules.jackpot?.count,
      rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.jackpot?.prize ?? 30) }],
    },
    cells: (legacyRules.cells ?? []).map((cell) => ({
      id: cell.id,
      kind: cell.kind,
      count: cell.count,
      rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(cell.value) }],
    })),
    achievements: {
      unlucky: {
        rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.achievements?.unlucky?.prize ?? 5) }],
      },
      careful: {
        rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.achievements?.careful?.prize ?? 5) }],
      },
      collector: {
        rewards: [
          { currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.achievements?.collector?.prize ?? 5) },
        ],
      },
      lucky: {
        rewards: [{ currencyId: defaultCurrencyId, value: Math.trunc(legacyRules.achievements?.lucky?.prize ?? 5) }],
      },
    },
  });
}

function migrateLegacyJourneyMapCell(
  cell: unknown,
  position: number,
  defaultCurrencyId: string,
): JourneyMapCell | null {
  if (!cell || typeof cell !== "object") {
    return null;
  }

  const legacyCell = cell as JourneyMapCell & { prize?: number };

  if ("rewards" in legacyCell && Array.isArray(legacyCell.rewards)) {
    return {
      id: legacyCell.id,
      kind: legacyCell.kind,
      rewards: normalizeJourneyCurrencyValues(legacyCell.rewards),
      isJackpot: legacyCell.isJackpot,
      winner: legacyCell.winner ?? null,
    };
  }

  if (legacyCell.isJackpot) {
    return {
      id: "jackpot",
      kind: "bonus",
      rewards: [],
      isJackpot: true,
      winner: legacyCell.winner ?? null,
    };
  }

  const prize = Math.trunc(legacyCell.prize ?? 0);

  return {
    id: `legacy_${position}`,
    kind: prize >= 0 ? "bonus" : "trap",
    rewards: prize ? [{ currencyId: defaultCurrencyId, value: prize }] : [],
    winner: legacyCell.winner ?? null,
  };
}

export function normalizeJourneyGame(rawGame: JourneyGame | null): JourneyGame | null {
  if (!rawGame) {
    return null;
  }

  const game = clone(rawGame) as JourneyGame & {
    rulesetId?: string;
    rulesetName?: string;
    currencies?: ConfigCurrency[];
    rules?: JourneyRules | Record<string, unknown>;
  };
  const rawRules = game.rules;
  game.createdAt = game.createdAt ?? getNowIso();
  game.updatedAt = game.updatedAt ?? game.createdAt;
  game.status = game.status ?? "in_progress";
  game.djName = game.djName ?? "";
  game.projectId = game.projectId ?? "";
  game.configId = game.configId ?? game.rulesetId ?? "oldbk2";
  game.configName = game.configName ?? game.rulesetName ?? game.configId;

  const legacyCurrencyLabel =
    typeof (rawRules as { currency?: string } | undefined)?.currency === "string"
      ? String((rawRules as { currency?: string }).currency)
      : "фишек";
  game.currencies =
    Array.isArray(game.currencies) && game.currencies.length
      ? game.currencies
      : [createDefaultJourneyCurrency(legacyCurrencyLabel)];
  game.rules = migrateLegacyJourneyRules(rawRules, game.currencies);
  game.map = Object.fromEntries(
    Object.entries(game.map ?? {}).flatMap(([position, cell]) => {
      const normalizedCell = migrateLegacyJourneyMapCell(cell, Number(position), game.currencies[0]?.id ?? "default");
      return normalizedCell ? [[Number(position), normalizedCell]] : [];
    }),
  );
  game.comments = game.comments ?? [];
  game.rounds = game.rounds ?? [];

  const journeyConfig = getJourneyConfig(game.rules, game.currencies);
  const initialBalance = createJourneyBalance(game.currencies, journeyConfig.initialRewards);
  const defaultCurrencyId = game.currencies[0]?.id ?? "default";

  game.players = (game.players ?? []).map((player, index) => {
    const legacyPlayer = player as JourneyPlayer & { prize?: number; previousPrize?: number };
    const balance =
      legacyPlayer.balance && Object.keys(legacyPlayer.balance).length
        ? normalizeJourneyBalance(legacyPlayer.balance, game.currencies)
        : createJourneyBalance(game.currencies, [
            {
              currencyId: defaultCurrencyId,
              value: Math.trunc(legacyPlayer.prize ?? journeyConfig.initialRewards[0]?.value ?? 0),
            },
          ]);
    const previousBalance =
      legacyPlayer.previousBalance && Object.keys(legacyPlayer.previousBalance).length
        ? normalizeJourneyBalance(legacyPlayer.previousBalance, game.currencies)
        : createJourneyBalance(game.currencies, [
            {
              currencyId: defaultCurrencyId,
              value: Math.trunc(
                legacyPlayer.previousPrize ?? balance[defaultCurrencyId] ?? initialBalance[defaultCurrencyId] ?? 0,
              ),
            },
          ]);

    return {
      id: player.id ?? generatePlayerId(player.nickname ?? `player-${index + 1}`),
      nickname: player.nickname,
      status: player.status ?? getPlayerStatus(player, journeyConfig.finishPosition),
      removedAt: player.removedAt ?? null,
      removedReason: player.removedReason ?? null,
      position: player.position ?? 0,
      previousBalance,
      balance,
      bonuses: clone(player.bonuses ?? []),
      movesHistory: clone(player.movesHistory ?? []),
    };
  });

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
        appliedRewards: clone(entry.appliedRewards ?? []),
        previousBalance: clone(entry.previousBalance ?? []),
        balanceAfterMove: clone(entry.balanceAfterMove ?? []),
        balanceAfterRound: clone(entry.balanceAfterRound ?? []),
        cell: entry.cell ? clone(entry.cell) : null,
      })) ??
      createEntriesFromLegacyRound(
        round as JourneyRound & {
          movesByNickname?: Record<string, JourneyMove & { previousPrize?: number; prize?: number }>;
        },
        playersByNickname,
        game.updatedAt ?? game.createdAt,
        game.currencies,
      ),
  }));

  game.status = isJourneyGameOver(game) ? "finished" : "in_progress";
  refreshGameIndexes(game, false);
  return game;
}

export function createJourneyGame(
  nicknames: string[],
  {
    randomFn = Math.random,
    rules = DEFAULT_JOURNEY_RULES,
    currencies = [createDefaultJourneyCurrency()],
    djName = "",
    projectId = "",
    configId = "oldbk2",
    configName = configId,
  }: {
    randomFn?: RandomFn;
    rules?: JourneyRules;
    currencies?: ConfigCurrency[];
    djName?: string;
    projectId?: string;
    configId?: string;
    configName?: string;
  } = {},
): JourneyGame {
  const createdAt = getNowIso();
  const normalizedCurrencies = currencies.length ? clone(currencies) : [createDefaultJourneyCurrency()];
  const normalizedRules = normalizeJourneyRules(rules);

  const game: JourneyGame = {
    createdAt,
    updatedAt: createdAt,
    moveIndex: 0,
    status: "in_progress",
    djName: djName.trim(),
    projectId: projectId.trim(),
    configId,
    configName,
    currencies: normalizedCurrencies,
    rules: normalizedRules,
    map: createMap(normalizedRules, randomFn),
    players: [...new Set(nicknames.map((nickname) => nickname.trim()).filter(Boolean))].map((nickname) =>
      createPlayer(nickname, normalizedRules, normalizedCurrencies),
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

export function getJourneyResults(game: JourneyGame): JourneyPlayer[] {
  return [...game.players]
    .filter((player) => player.status !== "removed")
    .sort((left, right) => left.nickname.localeCompare(right.nickname, "ru"));
}

function hasJourneyFinalSummary(game: JourneyGame): boolean {
  return (game.comments ?? []).some((comment) => comment === "==================== Итоги ====================");
}

function appendJourneyFinalSummary(game: JourneyGame): JourneyGame {
  if (hasJourneyFinalSummary(game)) {
    return game;
  }

  const results = getJourneyResults(game);
  const finalComments = [
    "==================== Итоги ====================",
    ...results.map(
      (player) =>
        `${player.nickname} — [${formatJourneyCurrencyValues(balanceToJourneyCurrencyValues(player.balance, game.currencies), game.currencies)}]`,
    ),
    `Финишировали: ${getJourneyFinishedPlayers(game).length}`,
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
  nextGame.currencies = getGameCurrencies(nextGame);
  nextGame.rules = getGameRules(nextGame);

  const journeyAchievements = getJourneyAchievements(nextGame.rules);
  const { finishPosition } = getJourneyConfig(nextGame.rules, nextGame.currencies);
  const activePlayers = getJourneyActivePlayers(nextGame);

  if (!activePlayers.length) {
    nextGame.status = "finished";
    appendJourneyFinalSummary(nextGame);
    return nextGame;
  }

  validateJourneyRoundInput(nextGame, activePlayers, inputMoves, skippedPlayerIds);

  nextGame.moveIndex += 1;
  const roundCreatedAt = getNowIso();
  const movesByPlayerId: JourneyMovesByPlayerId = {};
  const playersBeforeRoundById = indexPlayersById(activePlayers.map((player) => clone(player)));

  inputMoves.forEach(({ playerId, dice }: JourneyMoveInput) => {
    const player = getPlayerById(nextGame, playerId);

    if (!player || player.status !== "active") {
      return;
    }

    const move = buildMove(player, dice, nextGame.map, nextGame.rules, nextGame.currencies);

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

  Object.values(movesByPlayerId).forEach((move) => {
    const player = getPlayerById(nextGame, move.playerId);
    if (!player) {
      return;
    }

    applyMoveToPlayer(player, move, finishPosition);

    if (move.type === MOVE_TYPES.JACKPOT) {
      player.bonuses.push(clone(journeyAchievements.JACKPOT));
      const jackpotMove = achievementMoves.find(
        (achievementMove) =>
          achievementMove.playerId === player.id &&
          achievementMove.achievement.name === journeyAchievements.JACKPOT.name,
      );

      const appliedRewards = applyBonusRewardsToPlayer(
        player,
        journeyAchievements.JACKPOT,
        nextGame.rules,
        nextGame.currencies,
      );

      if (jackpotMove) {
        jackpotMove.appliedRewards = appliedRewards;
      } else {
        achievementMoves.push({
          type: MOVE_TYPES.ACHIEVEMENT,
          playerId: player.id,
          playerNickname: player.nickname,
          achievement: clone(journeyAchievements.JACKPOT),
          appliedRewards,
        });
      }
    }
  });

  achievementMoves
    .filter((achievementMove) => achievementMove.achievement.name !== journeyAchievements.JACKPOT.name)
    .forEach((achievementMove) => {
      const player = getPlayerById(nextGame, achievementMove.playerId);

      if (!player) {
        return;
      }

      player.bonuses.push(clone(achievementMove.achievement));
      achievementMove.appliedRewards = applyBonusRewardsToPlayer(
        player,
        achievementMove.achievement,
        nextGame.rules,
        nextGame.currencies,
      );
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
      currencies: nextGame.currencies,
    });
  });

  const roundComments: string[] = [buildRoundHeader(nextGame.moveIndex)];

  Object.values(movesByPlayerId).forEach((move) => {
    const player = getPlayerById(nextGame, move.playerId);

    if (player) {
      roundComments.push(buildJourneyComment({ move, player, currencies: nextGame.currencies, randomFn }));
    }
  });

  achievementMoves.forEach((achievementMove) => {
    const player = getPlayerById(nextGame, achievementMove.playerId);

    if (player) {
      roundComments.push(
        buildJourneyComment({
          achievement: achievementMove.achievement,
          player,
          currencies: nextGame.currencies,
          appliedRewards: achievementMove.appliedRewards,
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

export function getJourneyCellLabel(cell: JourneyMapCell | null, currencies: ConfigCurrency[]): string {
  if (!cell) {
    return "Пусто";
  }

  if (cell.isJackpot) {
    return "Сокровище";
  }

  if (!cell.rewards.length) {
    return "Пусто";
  }

  return `${cell.kind === "bonus" ? "Бонус" : "Ловушка"} ${formatJourneyCurrencyValues(cell.rewards, currencies, {
    showPlus: true,
    includeZero: true,
  })}`;
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

export function getAchievementMetadata(
  name: string,
  rules: JourneyRules = DEFAULT_JOURNEY_RULES,
): JourneyAchievement | null {
  return getAchievementBonus(name, rules);
}

export function getJourneyPlayerTimeline(game: JourneyGame, playerIdOrNickname: string): JourneyRoundEntry[] {
  return (game.rounds ?? []).flatMap((round) =>
    (round.entries ?? []).filter(
      (entry) => entry.playerId === playerIdOrNickname || entry.nickname === playerIdOrNickname,
    ),
  );
}

export function getJourneyPlayerTimelines(game: JourneyGame): Record<string, JourneyTimelineEntry[]> {
  const timelines = game.players.reduce<Record<string, JourneyTimelineEntry[]>>((accumulator, player) => {
    accumulator[player.id] = [];
    return accumulator;
  }, {});
  const playerIdsByNickname = game.players.reduce<Record<string, string>>((accumulator, player) => {
    accumulator[player.nickname] = player.id;
    return accumulator;
  }, {});

  (game.rounds ?? []).forEach((round) => {
    (round.entries ?? []).forEach((entry) => {
      const playerId = entry.playerId ?? playerIdsByNickname[entry.nickname];

      if (!playerId) {
        return;
      }

      if (!timelines[playerId]) {
        timelines[playerId] = [];
      }

      timelines[playerId].push({
        ...clone(entry),
        roundIndex: round.moveIndex,
      });
    });
  });

  return timelines;
}
