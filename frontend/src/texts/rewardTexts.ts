export const rewardTexts = {
  empty: "Без награды",
  rewardsCount: (count: number) => `Наград: ${count}`,
  variantsCount: (count: number) => `Вариантов: ${count}`,
  chancesCount: (count: number) => `Шансов: ${count}`,
} as const;
