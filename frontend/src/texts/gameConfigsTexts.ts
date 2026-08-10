import type { GameType } from "../features/projects/types";

const gameNames: Record<GameType, string> = {
  journey: "Карта Мародёров",
  lotto: "Лото",
  lotto_bingo: "Лото Бинго",
  battleships: "Морской бой",
};

const gameDescriptions: Record<GameType, string> = {
  journey: "Настройки поля, хода, бонусов, ловушек и наград.",
  lotto: "Диапазон чисел, размер карточек и призовые места.",
  lotto_bingo: "Бочонки и награды за раунды и финал игры.",
  battleships: "Размер доски, число выстрелов, состав флота и награды.",
};

export const gameConfigsTexts = {
  page: {
    title: "Конфиги игр",
    description: "Правила для новых игр. Уже созданные партии продолжают использовать сохранённый снимок конфига.",
    projectChip: (projectName: string) => `Проект: ${projectName}`,
    gameTypesChip: (count: number) => `Типов игр: ${count}`,
    configsChip: (count: number) => `Конфигов: ${count}`,
    refresh: "Обновить",
  },
  filter: {
    title: "Игры",
    description: "Выберите тип игры",
    countAriaLabel: (count: number) => `Типов игр: ${count}`,
    configCount: (count: number) => {
      const lastTwoDigits = count % 100;
      const lastDigit = count % 10;
      const label =
        lastTwoDigits >= 11 && lastTwoDigits <= 14
          ? "конфигов"
          : lastDigit === 1
            ? "конфиг"
            : lastDigit >= 2 && lastDigit <= 4
              ? "конфига"
              : "конфигов";

      return `${count} ${label}`;
    },
    info: "Конфиги редактируются отдельно для каждого типа игры.",
  },
  section: {
    gameName: (gameType: GameType) => gameNames[gameType],
    title: (gameType: GameType) => `Конфиги ${gameNames[gameType]}`,
    eyebrow: (gameType: GameType) => gameNames[gameType].toUpperCase(),
    description: (gameType: GameType) => gameDescriptions[gameType],
    searchPlaceholder: "Найти конфиг",
  },
  card: {
    appliesToNewGames: "Применяется к новым играм",
    editAriaLabel: (configName: string) => `Открыть конфиг «${configName}» для редактирования`,
    noDescription: "Описание не добавлено.",
    summary: {
      journey: {
        field: "Поле",
        fieldValue: (mapSize: number) => `${mapSize} клеток`,
        turn: "Ход",
        jackpot: "Джекпот",
        events: "События",
        eventsValue: (bonusKinds: number, trapKinds: number) => `${bonusKinds} бонуса · ${trapKinds} ловушки`,
      },
      battleships: {
        field: "Поле",
        shots: "Выстрелов",
        hit: "Попадание",
        fleet: "Флот",
      },
      lotto: {
        range: "Диапазон",
        card: "Карточка",
        cardValue: (numbersCount: number) => `${numbersCount} чисел`,
        firstPlace: "1 место",
        secondPlace: "2 место",
      },
    },
  },
  empty: {
    noConfigs: (gameType: GameType) => `Для игры «${gameNames[gameType]}» в этом проекте пока нет конфигов.`,
    searchTitle: "Ничего не найдено",
    searchDescription: "Измените поисковый запрос.",
  },
  alerts: {
    projectRequired: "Выберите проект, чтобы просматривать его игровые конфиги.",
    loadFailed: "Не удалось загрузить конфиг.",
    saveFailed: "Не удалось сохранить конфиг. Проверьте введённые значения и повторите попытку.",
  },
} as const;

export const gameConfigCloneTexts = {
  ariaLabel: (configName: string) => `Создать копию конфига «${configName}»`,
};
