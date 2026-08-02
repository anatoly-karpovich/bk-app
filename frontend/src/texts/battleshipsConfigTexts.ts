import type { BattleshipsConfigSectionId } from "../features/configs/types";

const sections: Record<
  BattleshipsConfigSectionId,
  { label: string; description: string; title: string; details: string }
> = {
  general: {
    label: "Общие",
    description: "Название и описание",
    title: "Основные сведения",
    details: "Название, описание и сводка текущих правил.",
  },
  boards: {
    label: "Доски",
    description: "Выбор размера поля",
    title: "Доступные доски",
    details: "Конфиг пока использует одну фиксированную игровую доску.",
  },
  board: {
    label: "Параметры доски",
    description: "Размер и выстрелы",
    title: "Доска 6 × 6",
    details: "Размер поля и максимальное число выстрелов.",
  },
  fleet: {
    label: "Флот",
    description: "Фиксированный состав кораблей",
    title: "Состав флота",
    details: "Количество кораблей каждого размера пока фиксировано.",
  },
  rewards: {
    label: "Награды",
    description: "Попадание и уничтожение",
    title: "Награды за выстрелы",
    details: "Награды за попадание и полное уничтожение корабля.",
  },
};

export const battleshipsConfigTexts = {
  page: {
    gameChip: "Морской бой",
    projectChip: (projectName: string) => `Проект: ${projectName}`,
    changesChip: (count: number) => (count ? `Изменено разделов: ${count}` : "Изменений нет"),
    description:
      "Изменения применяются только к новым играм; уже созданные партии используют сохранённый снимок правил.",
    reset: "Сбросить",
    save: "Сохранить изменения",
  },
  sections: {
    heading: "Разделы",
    description: "Настройки конфига",
    changedHint: "Изменённые разделы отмечаются значком. Сохраняется весь конфиг целиком.",
    details: sections,
  },
  general: {
    title: "Сведения о конфиге",
    description: "Отображаются в списке игровых конфигов.",
    name: "Название",
    configDescription: "Описание",
    summaryTitle: "Сводка текущих правил",
    summaryDescription: "Ключевые параметры выбранной доски.",
    board: "Поле",
    maxShots: "Максимум выстрелов",
    ships: "Кораблей",
    hitReward: "Попадание",
  },
  boards: {
    title: "Доски",
    description: "Конфиг пока поддерживает единственный размер игрового поля.",
    boardLabel: "Доска 6 × 6",
    boardDescription: (maxShots: number, ships: number) => `Активная · ${maxShots} выстрелов · ${ships} кораблей`,
    fixedNotice: "Добавление, удаление и изменение размера доски временно недоступны: бэкенд пока поддерживает только поле 6 × 6.",
  },
  board: {
    title: "Параметры доски 6 × 6",
    description: "Размер поля является идентификатором доски и пока не изменяется.",
    size: "Размер доски",
    maxShots: "Максимум выстрелов",
    previewTitle: "Предпросмотр игрового поля",
  },
  fleet: {
    title: "Состав флота",
    description: "Количество кораблей каждого размера.",
    total: (count: number) => `Всего: ${count}`,
    amount: "Количество",
    fixedNotice: "Состав флота временно фиксирован, пока бэкенд не поддерживает другие форматы доски и кораблей.",
    absent: "Награда за уничтожение сохраняется, хотя кораблей этого размера нет.",
    occupied: "Занято палубами",
    density: "Плотность поля",
  },
  rewards: {
    hitTitle: "Награда за попадание",
    hitDescription: "Выдаётся за каждый успешный выстрел.",
    destroyTitle: "Бонус за уничтожение корабля",
    destroyDescription: "Отдельный пул наград для каждого размера корабля.",
    shipTitle: (size: number) => `${size}-палубный`,
    shipsInFleet: (amount: number) => `Во флоте: ${amount}`,
    emptyReward: "Награды не заданы.",
  },
  alerts: {
    projectRequired: "Выберите проект, чтобы открыть игровой конфиг.",
    loadFailed: "Не удалось загрузить конфиг Морского боя.",
    notFound: "Конфиг Морского боя не найден в выбранном проекте.",
  },
} as const;
