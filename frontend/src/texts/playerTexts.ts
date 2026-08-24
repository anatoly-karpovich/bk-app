export const playerTexts = {
  autocomplete: {
    placeholder: "Введите ник",
    loading: "Загружаем игроков проекта…",
    empty: "В проекте пока нет игроков. Введите ник, чтобы создать первого.",
    loadError: "Не удалось загрузить список игроков. Можно ввести ник вручную.",
    create: (nickname: string) => `Создать нового игрока «${nickname}»`,
    aliases: (aliases: string[]) => `Также известен как: ${aliases.join(", ")}`,
  },
};
