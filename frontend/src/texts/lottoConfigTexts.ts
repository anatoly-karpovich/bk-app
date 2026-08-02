import type { LottoConfigSectionId } from "../features/configs/types";

const sections: Record<LottoConfigSectionId, { label: string; description: string; title: string; details: string }> = {
  general: {
    label: "Общие",
    description: "Название и описание",
    title: "Основные сведения",
    details: "Название, описание и сводка текущих правил.",
  },
  card: {
    label: "Карточка и диапазон",
    description: "Числа и размер карточки",
    title: "Параметры карточки",
    details: "Диапазон чисел и размер карточки игрока.",
  },
  prizes: {
    label: "Призы",
    description: "Три группы игроков",
    title: "Награды игроков",
    details: "Призы первого, второго места и остальных активных игроков.",
  },
  distribution: {
    label: "Распределение",
    description: "Правило при нескольких победителях",
    title: "Распределение награды",
    details: "Как выдавать приз, если победителей несколько.",
  },
};

export const lottoConfigTexts = {
  page: {
    gameChip: "Лото",
    projectChip: (projectName: string) => `Проект: ${projectName}`,
    changesChip: (count: number) => (count ? `Изменено разделов: ${count}` : "Изменений нет"),
    description: "Изменения применятся только к новым играм; уже созданные партии используют сохранённый снимок правил.",
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
    summaryDescription: "Ключевые параметры конфига.",
    range: "Диапазон",
    cardNumbers: "Чисел в карточке",
    firstPlace: "Первое место",
    secondPlace: "Второе место",
    cardNumbersValue: (count: number) => `${count} чисел`,
  },
  card: {
    title: "Карточка и диапазон",
    description: "Допустимый диапазон и количество уникальных чисел.",
    min: "Минимальное число",
    max: "Максимальное число",
    cardNumbersAmount: "Чисел в карточке",
    previewBadge: "Предпросмотр",
    previewTitle: "Карточка игрока",
    previewDescription: (count: number, min: number, max: number) => `${count} уникальных чисел из диапазона ${min}–${max}.`,
  },
  prizes: {
    title: "Призы",
    description: "Награды для победителей и остальных активных игроков.",
    firstPlace: { title: "Первое место", description: "Победитель розыгрыша" },
    secondPlace: { title: "Второе место", description: "Следующий игрок по результату" },
    otherPlayers: { title: "Остальные активные игроки", description: "Не занявшие первое или второе место" },
    emptyPrize: "Награды не заданы.",
  },
  distribution: {
    title: "Распределение награды",
    description: "Как выдавать приз, если победителей несколько.",
    full: {
      title: "Полная награда каждому победителю",
      description: "Каждый игрок получает полный настроенный пул наград без деления между победителями.",
    },
    split: {
      title: "Разделить банк между победителями",
      description: "Пул распределяется между победителями. Сервер проверит, что выбранные награды можно делить.",
    },
  },
  alerts: {
    projectRequired: "Выберите проект, чтобы открыть игровой конфиг.",
    loadFailed: "Не удалось загрузить конфиг Лото.",
    notFound: "Конфиг Лото не найден в выбранном проекте.",
  },
} as const;
