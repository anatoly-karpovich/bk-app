import { ANALYTICS_SOURCE_TYPES, type AnalyticsSourceType } from "../../analytics/domain/sourceTypes";
import type { ProjectActivityTypeSettings } from "./types";

const DEFAULT_TITLES: Readonly<Record<AnalyticsSourceType, string>> = {
  journey: "Карта Мародёров",
  battleships: "Морской бой",
  lotto: "Лото",
  lotto_bingo: "Лото Бинго",
  quiz: "Викторина",
  memes: "Игра «Карты, Мемы, Два ствола!»",
  forum_quiz: "Форумная викторина",
  tournament: "Турнир",
  forecast_contest: "Конкурс Прогнозистов",
  contest: "Конкурс",
};

/** Returns a new complete settings list in the stable Analytics category order. */
export function createDefaultProjectActivityTypes(): ProjectActivityTypeSettings[] {
  return ANALYTICS_SOURCE_TYPES.map((type) => ({
    type,
    defaultTitle: DEFAULT_TITLES[type],
    enabled: true,
  }));
}

/**
 * Legacy or older Project documents may not yet include every known activity type.
 * Reads expose the complete configuration without mutating persisted data.
 */
export function normalizeProjectActivityTypes(
  activityTypes: ReadonlyArray<ProjectActivityTypeSettings> | undefined,
): ProjectActivityTypeSettings[] {
  const defaults = createDefaultProjectActivityTypes();
  if (!activityTypes) return defaults;

  const savedByType = new Map(activityTypes.map((activityType) => [activityType.type, activityType]));
  return defaults.map((defaultSetting) => structuredClone(savedByType.get(defaultSetting.type) ?? defaultSetting));
}
