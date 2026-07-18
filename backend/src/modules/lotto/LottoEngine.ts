import { randomUUID } from "node:crypto";
import {
  divideCurrencyValues,
  formatCurrencyValues,
  hasAnyNonZeroCurrencyValues,
  normalizeCurrencyValues,
} from "../../common/currencyValues";
import type { ConfigCurrency } from "../configs/domain/types";
import { createDefaultConfigCurrency, normalizeConfigCurrencies } from "../configs/domain/normalizeConfig";
import { normalizeLottoRules } from "./domain/config";
import type {
  LottoCreatePlayerInput,
  LottoCurrencyValue,
  LottoEvent,
  LottoGame,
  LottoPlayer,
  LottoPlayerReadModel,
  LottoRules,
} from "./domain/types";
import { LottoValidationError } from "./errors";

type LegacyLottoRules = {
  min: number;
  max: number;
  cardNumbersAmount: number;
  firstPlacePrize?: LottoCurrencyValue[] | number;
  secondPlacePrize?: LottoCurrencyValue[] | number;
  otherActivePlayersPrize?: LottoCurrencyValue[] | number;
  rewardDistributionMode: LottoRules["rewardDistributionMode"];
};

type LegacyLottoGame = Omit<LottoGame, "rules" | "currencies"> & {
  currency?: string;
  currencies?: ConfigCurrency[];
  rules: LegacyLottoRules;
};

export class LottoEngine {
  normalizeGame(game: LottoGame | null): LottoGame | null {
    if (!game) {
      return null;
    }

    const legacyGame = this.clone(game) as LegacyLottoGame;
    const currencies = this.normalizeCurrencies(legacyGame.currencies, legacyGame.currency);
    const defaultCurrencyId = currencies[0]?.id ?? "default";
    const normalizedGame: LottoGame = {
      ...legacyGame,
      djName: legacyGame.djName.trim(),
      projectId: legacyGame.projectId?.trim() ?? "",
      configId: legacyGame.configId.trim(),
      configName: legacyGame.configName.trim(),
      currencies,
      rules: normalizeLottoRules(this.normalizeLegacyRules(legacyGame.rules, defaultCurrencyId)),
    };

    normalizedGame.drawnNumbers = this.uniqueNumbers(normalizedGame.drawnNumbers);
    normalizedGame.availableNumbers = this.normalizeAvailableNumbers(
      normalizedGame.rules,
      normalizedGame.drawnNumbers,
      normalizedGame.availableNumbers,
    );
    normalizedGame.players = this.normalizePlayers(normalizedGame.players, normalizedGame.rules);
    normalizedGame.status = this.computeStatus(normalizedGame);

    if (normalizedGame.status === "finished" && !normalizedGame.finishedAt) {
      normalizedGame.finishedAt = normalizedGame.updatedAt;
    }

    return normalizedGame;
  }

  createGame(
    players: LottoCreatePlayerInput[],
    options: {
      rules: LottoRules;
      currencies: ConfigCurrency[];
      djName?: string;
      projectId?: string;
      configId?: string;
      configName?: string;
    },
  ): LottoGame {
    const now = new Date().toISOString();
    const currencies = this.normalizeCurrencies(options.currencies);
    const rules = normalizeLottoRules(options.rules);
    const normalizedPlayers = this.createPlayers(players, rules);

    return {
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
      status: "in_progress",
      djName: options.djName?.trim() ?? "",
      projectId: options.projectId?.trim() ?? "",
      configId: options.configId?.trim() ?? "",
      configName: options.configName?.trim() ?? "",
      currencies,
      rules,
      drawnNumbers: [],
      availableNumbers: this.createAvailableNumbers(rules),
      players: normalizedPlayers,
      events: [],
    };
  }

  drawNextNumber(game: LottoGame, randomFn: () => number = Math.random): LottoGame {
    const normalizedGame = this.normalizeGame(game);

    if (!normalizedGame) {
      throw new LottoValidationError("Lotto draw failed: game is missing");
    }

    if (normalizedGame.status === "finished") {
      throw new LottoValidationError("Lotto draw failed: game is already finished");
    }

    if (!this.getActivePlayers(normalizedGame).length) {
      throw new LottoValidationError("Lotto draw failed: there are no active players");
    }

    if (!normalizedGame.availableNumbers.length) {
      throw new LottoValidationError("Lotto draw failed: all numbers have already been drawn");
    }

    const nextGame = this.clone(normalizedGame);
    const drawIndex = Math.floor(randomFn() * nextGame.availableNumbers.length);
    const nextNumber = nextGame.availableNumbers.splice(drawIndex, 1)[0];
    nextGame.drawnNumbers.push(nextNumber);
    nextGame.events.push(this.createDrawEvent(nextNumber, nextGame.drawnNumbers.length));

    return this.finalizeGame(nextGame);
  }

  removePlayer(game: LottoGame, playerId: string): LottoGame {
    const normalizedGame = this.normalizeGame(game);

    if (!normalizedGame) {
      throw new LottoValidationError("Lotto remove failed: game is missing");
    }

    if (normalizedGame.status === "finished") {
      throw new LottoValidationError("Lotto remove failed: finished games cannot be changed");
    }

    const nextGame = this.clone(normalizedGame);
    const player = nextGame.players.find((playerItem) => playerItem.id === playerId);

    if (!player) {
      throw new LottoValidationError(`Lotto remove failed: player "${playerId}" was not found`);
    }

    if (player.status === "removed") {
      throw new LottoValidationError(`Lotto remove failed: player "${player.nickname}" is already removed`);
    }

    player.status = "removed";
    player.removedAt = new Date().toISOString();
    player.removedReason = "excluded_by_host";
    nextGame.events.push({
      createdAt: player.removedAt,
      type: "player_removed",
      message: `Игрок ${player.nickname} исключен из партии.`,
    });

    return this.finalizeGame(nextGame);
  }

  getPlayerView(player: LottoPlayer, drawnNumbers: number[]): LottoPlayerReadModel {
    const matchedNumbers = player.cardNumbers.filter((number) => drawnNumbers.includes(number));
    const remainingNumbers = player.cardNumbers.filter((number) => !drawnNumbers.includes(number));

    return {
      ...this.clone(player),
      matchedNumbers,
      remainingNumbers,
      remainingCount: remainingNumbers.length,
    };
  }

  getPlayerViews(game: LottoGame): LottoPlayerReadModel[] {
    return game.players.map((player) => this.getPlayerView(player, game.drawnNumbers));
  }

  getLegacySummaryText(game: LottoGame): string {
    const players = this.getPlayerViews(game).filter((player) => player.status !== "removed");

    if (!players.length) {
      return "";
    }

    const groupedByRemaining = players.reduce<Map<number, string[]>>((result, player) => {
      const current = result.get(player.remainingCount) ?? [];
      current.push(player.nickname);
      result.set(player.remainingCount, current);
      return result;
    }, new Map<number, string[]>());

    return Array.from(groupedByRemaining.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([remainingCount, nicknames]) =>
        `${remainingCount === 0 ? "Всё закрыли" : `${remainingCount} не закрыли`}: ${nicknames.join(", ")}`,
      )
      .join("\n");
  }

  getFirstPlaceWinners(game: LottoGame): LottoPlayerReadModel[] {
    return this.getPlayerViews(game).filter((player) => player.status === "winner_first");
  }

  getSecondPlaceWinners(game: LottoGame): LottoPlayerReadModel[] {
    return this.getPlayerViews(game).filter((player) => player.status === "winner_second");
  }

  private createPlayers(players: LottoCreatePlayerInput[], rules: LottoRules): LottoPlayer[] {
    if (!players.length) {
      throw new LottoValidationError("Lotto create failed: at least one player is required");
    }

    const normalizedNicknames = new Set<string>();

    return players.map((player) => {
      const nickname = player.nickname.trim();

      if (!nickname) {
        throw new LottoValidationError("Lotto create failed: player nickname must not be empty");
      }

      const nicknameKey = nickname.toLocaleLowerCase("ru");

      if (normalizedNicknames.has(nicknameKey)) {
        throw new LottoValidationError(`Lotto create failed: duplicate player nickname "${nickname}"`);
      }

      normalizedNicknames.add(nicknameKey);

      return {
        id: randomUUID(),
        nickname,
        status: "active",
        removedAt: null,
        removedReason: null,
        cardNumbers: this.normalizeCardNumbers(player.cardNumbers, rules, nickname),
      };
    });
  }

  private normalizePlayers(players: LottoPlayer[], rules: LottoRules): LottoPlayer[] {
    const nicknameKeys = new Set<string>();

    return players.map((player) => {
      const nickname = player.nickname.trim();

      if (!nickname) {
        throw new LottoValidationError("Lotto validation failed: persisted player nickname must not be empty");
      }

      const nicknameKey = nickname.toLocaleLowerCase("ru");

      if (nicknameKeys.has(nicknameKey)) {
        throw new LottoValidationError(`Lotto validation failed: duplicate persisted nickname "${nickname}"`);
      }

      nicknameKeys.add(nicknameKey);

      return {
        ...player,
        id: player.id.trim() || randomUUID(),
        nickname,
        status: player.status ?? "active",
        removedAt: player.removedAt ?? null,
        removedReason: player.removedReason ?? null,
        cardNumbers: this.normalizeCardNumbers(player.cardNumbers, rules, nickname),
      };
    });
  }

  private normalizeCardNumbers(cardNumbers: number[], rules: LottoRules, nickname: string): number[] {
    if (!Array.isArray(cardNumbers) || !cardNumbers.length) {
      throw new LottoValidationError(`Lotto validation failed: player "${nickname}" card is empty`);
    }

    const normalizedNumbers = cardNumbers.map((value) => Math.trunc(value));

    if (normalizedNumbers.length !== rules.cardNumbersAmount) {
      throw new LottoValidationError(
        `Lotto validation failed: player "${nickname}" must have exactly ${rules.cardNumbersAmount} numbers`,
      );
    }

    const uniqueNumbers = new Set<number>();

    normalizedNumbers.forEach((number) => {
      if (!Number.isInteger(number)) {
        throw new LottoValidationError(`Lotto validation failed: player "${nickname}" card contains a non-integer value`);
      }

      if (number < rules.min || number > rules.max) {
        throw new LottoValidationError(
          `Lotto validation failed: player "${nickname}" card contains a number outside ${rules.min}-${rules.max}`,
        );
      }

      if (uniqueNumbers.has(number)) {
        throw new LottoValidationError(`Lotto validation failed: player "${nickname}" card contains duplicates`);
      }

      uniqueNumbers.add(number);
    });

    return normalizedNumbers.sort((left, right) => left - right);
  }

  private finalizeGame(game: LottoGame): LottoGame {
    game.updatedAt = new Date().toISOString();
    const prizeGroups = this.resolvePrizeGroups(game);

    if (prizeGroups) {
      this.applyWinnerStatuses(game, prizeGroups.firstPlaceIds, prizeGroups.secondPlaceIds);
      game.status = "finished";
      game.finishedAt = game.updatedAt;
      this.appendFinishEvents(game, prizeGroups);
      return game;
    }

    if (!this.getActivePlayers(game).length) {
      game.status = "finished";
      game.finishedAt = game.updatedAt;
      game.events.push({
        createdAt: game.updatedAt,
        type: "game_finished",
        message: "Игра завершилась без активных участников.",
      });
      return game;
    }

    game.status = "in_progress";
    game.finishedAt = null;
    return game;
  }

  private computeStatus(game: LottoGame): "in_progress" | "finished" {
    if (game.finishedAt) {
      return "finished";
    }

    if (!this.getActivePlayers(game).length) {
      return "finished";
    }

    return this.resolvePrizeGroups(game) ? "finished" : "in_progress";
  }

  private resolvePrizeGroups(
    game: LottoGame,
  ): { firstPlaceIds: string[]; secondPlaceIds: string[]; otherPrizeIds: string[] } | null {
    const playerViews = this.getPlayerViews(game).filter((player) => player.status !== "removed");

    if (!playerViews.length) {
      return null;
    }

    const firstPlaceWinners = playerViews.filter((player) => player.remainingCount === 0);

    if (!firstPlaceWinners.length) {
      return null;
    }

    const runnerUps = playerViews.filter((player) => player.remainingCount > 0);
    const minRemainingCount = Math.min(...runnerUps.map((player) => player.remainingCount), Number.POSITIVE_INFINITY);
    const secondPlaceWinners =
      minRemainingCount === Number.POSITIVE_INFINITY
        ? []
        : runnerUps.filter((player) => player.remainingCount === minRemainingCount);
    const secondPlaceIdSet = new Set(secondPlaceWinners.map((player) => player.id));
    const otherPrizePlayers = runnerUps.filter((player) => !secondPlaceIdSet.has(player.id));

    return {
      firstPlaceIds: firstPlaceWinners.map((player) => player.id),
      secondPlaceIds: secondPlaceWinners.map((player) => player.id),
      otherPrizeIds: otherPrizePlayers.map((player) => player.id),
    };
  }

  private applyWinnerStatuses(game: LottoGame, firstPlaceIds: string[], secondPlaceIds: string[]): void {
    const firstPlaceSet = new Set(firstPlaceIds);
    const secondPlaceSet = new Set(secondPlaceIds);

    game.players.forEach((player) => {
      if (player.status === "removed") {
        return;
      }

      if (firstPlaceSet.has(player.id)) {
        player.status = "winner_first";
        return;
      }

      if (secondPlaceSet.has(player.id)) {
        player.status = "winner_second";
        return;
      }

      player.status = "active";
    });
  }

  private appendFinishEvents(
    game: LottoGame,
    prizeGroups: { firstPlaceIds: string[]; secondPlaceIds: string[]; otherPrizeIds: string[] },
  ): void {
    const legacySummaryText = this.getLegacySummaryText(game);
    const playerViews = this.getPlayerViews(game);
    const firstPlaceIdSet = new Set(prizeGroups.firstPlaceIds);
    const secondPlaceIdSet = new Set(prizeGroups.secondPlaceIds);
    const otherPrizeIdSet = new Set(prizeGroups.otherPrizeIds);
    const firstPlaceWinners = playerViews.filter((player) => firstPlaceIdSet.has(player.id));
    const secondPlaceWinners = playerViews.filter((player) => secondPlaceIdSet.has(player.id));
    const otherPrizePlayers = playerViews.filter((player) => otherPrizeIdSet.has(player.id));
    const finishTimestamp = game.finishedAt ?? game.updatedAt;

    game.events.push({
      createdAt: finishTimestamp,
      type: "game_finished",
      message: `Игра завершилась за ${game.drawnNumbers.length} ходов!`,
    });

    if (legacySummaryText) {
      game.events.push({
        createdAt: finishTimestamp,
        type: "game_finished",
        message: legacySummaryText,
      });
    }

    if (firstPlaceWinners.length) {
      const prize = this.resolvePrizePerWinner(game.rules.firstPlacePrize, firstPlaceWinners.length, game.rules.rewardDistributionMode);
      game.events.push({
        createdAt: finishTimestamp,
        type: "prizes_awarded",
        message: `1 место: ${firstPlaceWinners.map((player) => player.nickname).join(", ")} - по ${formatCurrencyValues(prize, game.currencies, { includeZero: false })}.`,
      });
    }

    if (secondPlaceWinners.length) {
      const prize = this.resolvePrizePerWinner(game.rules.secondPlacePrize, secondPlaceWinners.length, game.rules.rewardDistributionMode);
      game.events.push({
        createdAt: finishTimestamp,
        type: "prizes_awarded",
        message: `2 место: ${secondPlaceWinners.map((player) => player.nickname).join(", ")} - по ${formatCurrencyValues(prize, game.currencies, { includeZero: false })}.`,
      });
    }

    if (otherPrizePlayers.length && hasAnyNonZeroCurrencyValues(game.rules.otherActivePlayersPrize)) {
      const prize = this.resolvePrizePerWinner(
        game.rules.otherActivePlayersPrize,
        otherPrizePlayers.length,
        game.rules.rewardDistributionMode,
      );
      game.events.push({
        createdAt: finishTimestamp,
        type: "prizes_awarded",
        message: `Остальные: ${otherPrizePlayers.map((player) => player.nickname).join(", ")} - по ${formatCurrencyValues(prize, game.currencies, { includeZero: false })}.`,
      });
    }
  }

  private resolvePrizePerWinner(
    totalPrize: LottoCurrencyValue[],
    winnersCount: number,
    rewardDistributionMode: LottoRules["rewardDistributionMode"],
  ): LottoCurrencyValue[] {
    if (rewardDistributionMode === "split_pool" && winnersCount > 0) {
      return divideCurrencyValues(totalPrize, winnersCount);
    }

    return normalizeCurrencyValues(totalPrize);
  }

  private createAvailableNumbers(rules: LottoRules): number[] {
    const availableNumbers: number[] = [];

    for (let value = rules.min; value <= rules.max; value += 1) {
      availableNumbers.push(value);
    }

    return availableNumbers;
  }

  private normalizeAvailableNumbers(rules: LottoRules, drawnNumbers: number[], availableNumbers: number[]): number[] {
    const validAvailableNumbers = Array.isArray(availableNumbers) ? availableNumbers.map((value) => Math.trunc(value)) : [];
    const drawnNumbersSet = new Set(drawnNumbers);
    const normalizedAvailable = validAvailableNumbers.filter(
      (value, index, items) =>
        value >= rules.min &&
        value <= rules.max &&
        !drawnNumbersSet.has(value) &&
        items.indexOf(value) === index,
    );

    if (normalizedAvailable.length) {
      return normalizedAvailable;
    }

    return this.createAvailableNumbers(rules).filter((value) => !drawnNumbersSet.has(value));
  }

  private getActivePlayers(game: LottoGame): LottoPlayer[] {
    return game.players.filter((player) => player.status !== "removed");
  }

  private createDrawEvent(nextNumber: number, drawCount: number): LottoEvent {
    return {
      createdAt: new Date().toISOString(),
      type: "number_drawn",
      message: `${drawCount === 1 ? "Первое" : "Следующее"} выпавшее число: ${nextNumber}`,
    };
  }

  private uniqueNumbers(values: number[]): number[] {
    return Array.from(new Set(values.map((value) => Math.trunc(value))));
  }

  private normalizeLegacyRules(rules: LegacyLottoRules, defaultCurrencyId: string): LottoRules {
    return {
      min: rules.min,
      max: rules.max,
      cardNumbersAmount: rules.cardNumbersAmount,
      firstPlacePrize: this.toCurrencyValues(rules.firstPlacePrize, defaultCurrencyId),
      secondPlacePrize: this.toCurrencyValues(rules.secondPlacePrize, defaultCurrencyId),
      otherActivePlayersPrize: this.toCurrencyValues(rules.otherActivePlayersPrize, defaultCurrencyId),
      rewardDistributionMode: rules.rewardDistributionMode,
    };
  }

  private toCurrencyValues(values: LottoCurrencyValue[] | number | undefined, defaultCurrencyId: string): LottoCurrencyValue[] {
    if (Array.isArray(values)) {
      return normalizeCurrencyValues(values);
    }

    if (!Number.isFinite(values)) {
      return [];
    }

    const numericValue = Number(values);
    return [{ currencyId: defaultCurrencyId, value: Math.max(0, Math.trunc(numericValue)) }];
  }

  private normalizeCurrencies(currencies: ConfigCurrency[] | undefined, legacyCurrencyLabel?: string): ConfigCurrency[] {
    const normalizedCurrencies = normalizeConfigCurrencies(currencies ?? []);

    if (normalizedCurrencies.length) {
      return normalizedCurrencies;
    }

    return [createDefaultConfigCurrency(legacyCurrencyLabel)];
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
