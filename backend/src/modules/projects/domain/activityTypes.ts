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
 * Legacy Project documents predate activity settings. Their reads must still expose
 * the complete default configuration until the first explicit Project update.
 */
export function normalizeProjectActivityTypes(
  activityTypes: ReadonlyArray<ProjectActivityTypeSettings> | undefined,
): ProjectActivityTypeSettings[] {
  return activityTypes ? activityTypes.map((activityType) => structuredClone(activityType)) : createDefaultProjectActivityTypes();
}
