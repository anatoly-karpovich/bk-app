export type LottoBingoConfirmation = "start" | "draw" | "winners" | "finalize" | "delete" | "remove" | "disqualify";

interface LottoBingoConfirmationCopyInput {
  confirmation: LottoBingoConfirmation;
  selectedWinnersCount: number;
  targetPlayerName: string | null;
  requiresDrawWithoutWinnerConfirmation: boolean;
}

interface LottoBingoConfirmationCopy {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "error" | "primary";
}

export function getLottoBingoConfirmationCopy({
  confirmation,
  selectedWinnersCount,
  targetPlayerName,
  requiresDrawWithoutWinnerConfirmation,
}: LottoBingoConfirmationCopyInput): LottoBingoConfirmationCopy {
  switch (confirmation) {
    case "start":
      return {
        title: "Начать игру?",
        description: "Регистрация закроется, добавление новых игроков станет недоступно.",
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
    case "draw":
      return {
        title: "Вытянуть следующий бочонок?",
        description: requiresDrawWithoutWinnerConfirmation
          ? "Есть неподтверждённые кандидаты. Проверьте чат перед продолжением тиража."
          : "Будет вытянут следующий бочонок.",
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
    case "winners":
      return {
        title: "Подтвердить победителей?",
        description: `Будут подтверждены: ${selectedWinnersCount}. Раунд перейдёт к следующему этапу.`,
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
    case "finalize":
      return {
        title: "Финализировать игру?",
        description: "Награды финальных категорий будут разрешены и сохранены. Игра станет неизменяемой.",
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
    case "delete":
      return {
        title: "Удалить игру?",
        description: "Игра будет удалена безвозвратно.",
        confirmLabel: "Удалить",
        confirmColor: "error",
      };
    case "remove":
      return {
        title: "Удалить игрока?",
        description: `${targetPlayerName ?? "Игрок"}: действие изменит состояние игры.`,
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
    case "disqualify":
      return {
        title: "Дисквалифицировать игрока?",
        description: `${targetPlayerName ?? "Игрок"}: действие изменит состояние игры.`,
        confirmLabel: "Подтвердить",
        confirmColor: "primary",
      };
  }
}
