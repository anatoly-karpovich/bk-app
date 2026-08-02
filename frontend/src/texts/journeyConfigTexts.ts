import type { JourneyConfigSectionId } from "../features/configs/components/JourneyConfigEditor";

const sections: Record<"general" | JourneyConfigSectionId, { title: string; description: string }> = {
  general: { title: "Основные сведения", description: "Название, описание и сводка текущих правил." },
  map: { title: "Параметры карты", description: "Размер поля, диапазон броска и лимиты ресурсов." },
  rewards: {
    title: "Стартовый пул наград",
    description: "Ресурсы, которые получает каждый игрок при старте.",
  },
  jackpot: { title: "Настройки сокровищ", description: "Количество сокровищ и награды за них." },
  cells: { title: "Типы клеток", description: "Бонусные клетки и ловушки на игровом поле." },
  achievements: {
    title: "Награды достижений",
    description: "Условия задаёт движок; здесь настраиваются только награды.",
  },
};

export const journeyConfigTexts = {
  page: {
    gameChip: "Карта Мародёров",
    projectChip: (projectName: string) => `Проект: ${projectName}`,
    changesChip: (count: number) => (count ? `Изменено разделов: ${count}` : "Изменений нет"),
    description:
      "Изменения применятся только к новым играм; уже созданные партии используют сохранённый снимок правил.",
    back: "К конфигам",
    reset: "Сбросить",
    save: "Сохранить изменения",
  },
  sections: {
    heading: "Разделы",
    description: "Настройки конфига",
    count: 6,
    changedHint: "Изменённые разделы отмечаются значком. Сохранение выполняется для всего конфига.",
    general: { label: "Общие", description: "Название и описание" },
    map: { label: "Карта и ход", description: "Поле, кубик и лимиты" },
    rewards: { label: "Стартовые награды", description: "Начальный пул" },
    jackpot: { label: "Сокровище", description: "Количество и награда" },
    cells: { label: "Клетки поля", description: "Бонусы и ловушки" },
    achievements: { label: "Достижения", description: "Награды достижений" },
    details: sections,
  },
  cells: {
    title: "Клетки поля",
    description: "Типы бонусных клеток и ловушек.",
    selectedEyebrow: "Выбранная клетка",
    addCell: "Добавить тип клетки",
    addResource: "Добавить ресурс",
    groups: {
      bonus: { title: "Бонусы", status: "Положительные" },
      trap: { title: "Ловушки", status: "Отрицательные" },
    },
    name: (kind: "bonus" | "trap", id: string) => {
      const names: Record<"bonus" | "trap", Record<string, string>> = {
        bonus: { small: "Малый бонус", medium: "Средний бонус", large: "Большой бонус" },
        trap: { small: "Малая ловушка", medium: "Средняя ловушка", large: "Большая ловушка" },
      };
      return names[kind][id] ?? id;
    },
    emptyReward: "Награда не задана",
  },
  achievements: {
    title: "Достижения",
    description: "Условия достижений определяются движком игры; здесь настраиваются только награды.",
    entries: {
      unlucky: { label: "Невезучий", condition: "3 ловушки подряд" },
      careful: { label: "Осторожный", condition: "4 пустые клетки подряд" },
      collector: { label: "Коллекционер", condition: "Все виды клеток" },
      lucky: { label: "Счастливчик", condition: "5 наград подряд" },
    },
  },
  general: {
    title: "Сведения о конфиге",
    description: "Отображаются в списке игровых конфигов.",
    name: "Название",
    configDescription: "Описание",
    summaryTitle: "Сводка текущих правил",
    summaryDescription: "Быстрый просмотр ключевых параметров конфига.",
    map: "Поле",
    move: "Ход",
    jackpot: "Джекпот",
    cells: "Клетки",
    mapValue: (size: number) => `${size} клеток`,
    cellsValue: (bonuses: number, traps: number) => `${bonuses} бонуса · ${traps} ловушки`,
    jackpotByPlayersValue: (playersPerJackpot: number) => `${playersPerJackpot} игроков`,
  },
  alerts: {
    projectRequired: "Выберите проект, чтобы открыть игровой конфиг.",
    loadFailed: "Не удалось загрузить конфиг Journey.",
    notFound: "Конфиг Journey не найден в выбранном проекте.",
    saveFailed: "Не удалось сохранить конфиг. Проверьте введённые значения и повторите попытку.",
    legacyFormat: "Конфиг загружен в устаревшем формате. Обновите бэкенд и перезагрузите страницу.",
  },
} as const;
