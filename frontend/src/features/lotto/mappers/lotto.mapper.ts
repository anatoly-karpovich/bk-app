import { lottoTexts } from "../../../texts/lottoTexts";
import type {
  LottoPersistedGame,
  LottoRules,
  LottoSavedGameSummary,
  LottoSetupPlayerInputError,
  LottoStatusChip,
} from "../types";

export function parseLottoNumbersInput(value: string): number[] {
  const matches = value.match(/\d+/g) ?? [];
  return matches.map((item) => Number(item));
}

export function generateLottoCardNumbers(rules: LottoRules): number[] {
  const generatedNumbers = new Set<number>();

  while (generatedNumbers.size < rules.cardNumbersAmount) {
    const nextNumber = Math.floor(Math.random() * (rules.max - rules.min + 1)) + rules.min;
    generatedNumbers.add(nextNumber);
  }

  return Array.from(generatedNumbers).sort((left, right) => left - right);
}

export function formatLottoTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function createLottoStatusChips(params: {
  game: LottoPersistedGame | null;
  djName: string;
  selectedConfigName?: string;
}): LottoStatusChip[] {
  const { game, djName, selectedConfigName } = params;
  const resolvedDjName = game?.djName?.trim() || djName.trim();
  const rulesetLabel = `${lottoTexts.statuses.rulesetPrefix} ${game?.configName ?? selectedConfigName ?? "Не выбран"}`;

  if (!game) {
    return [
      { label: lottoTexts.statuses.notStarted, color: "default" },
      { label: rulesetLabel, color: "secondary" },
      ...(resolvedDjName ? [{ label: `${lottoTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" as const }] : []),
    ];
  }

  const chips: LottoStatusChip[] = [
    {
      label: game.derived.gameIsOver ? lottoTexts.statuses.complete : lottoTexts.statuses.active,
      color: game.derived.gameIsOver ? "success" : "default",
    },
    { label: rulesetLabel, color: "secondary" },
    { label: `${lottoTexts.statuses.drawPrefix} ${game.derived.drawCount}`, color: "primary" },
    { label: `${lottoTexts.statuses.playersPrefix} ${game.derived.activePlayers.length}`, color: "info" },
  ];

  if (resolvedDjName) {
    chips.push({ label: `${lottoTexts.statuses.djPrefix} ${resolvedDjName}`, color: "info" });
  }

  return chips;
}

export function getLottoSavedGameStatusLabel(game: LottoSavedGameSummary): string {
  return game.status === "finished" ? lottoTexts.statuses.complete : lottoTexts.statuses.active;
}

export function validateLottoCardNumbers(numbers: number[], rules: LottoRules | null): string | null {
  if (!rules) {
    return "Конфиг Lotto не выбран.";
  }

  if (numbers.length !== rules.cardNumbersAmount) {
    return `Нужно ${rules.cardNumbersAmount} уникальных чисел.`;
  }

  if (new Set(numbers).size !== numbers.length) {
    return "Числа в карточке должны быть уникальными.";
  }

  if (numbers.some((number) => !Number.isInteger(number) || number < rules.min || number > rules.max)) {
    return `Числа должны быть в диапазоне ${rules.min}-${rules.max}.`;
  }

  return null;
}

export function getLottoCardPlaceholder(rules: LottoRules | null): string {
  if (!rules) {
    return "Введите числа через запятую";
  }

  return `${rules.cardNumbersAmount} чисел через запятую (${rules.min}-${rules.max})`;
}

export function isLottoSetupValid(errors: LottoSetupPlayerInputError[]): boolean {
  return errors.length > 0 && errors.every((error) => !error.nickname && !error.cardNumbers);
}
