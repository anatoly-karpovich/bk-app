import assert from "node:assert/strict";
import test from "node:test";
import { ANALYTICS_SOURCE_TYPES } from "../../analytics/domain/sourceTypes";
import {
  createDefaultProjectActivityTypes,
  normalizeProjectActivityTypes,
} from "./activityTypes";

test("creates the ten enabled project activity type defaults in stable Analytics order", () => {
  const activityTypes = createDefaultProjectActivityTypes();

  assert.deepEqual(
    activityTypes.map((activityType) => activityType.type),
    ANALYTICS_SOURCE_TYPES,
  );
  assert.equal(activityTypes.every((activityType) => activityType.enabled), true);
  assert.deepEqual(
    activityTypes.map((activityType) => activityType.defaultTitle),
    [
      "Карта Мародёров",
      "Морской бой",
      "Лото",
      "Лото Бинго",
      "Викторина",
      "Игра «Карты, Мемы, Два ствола!»",
      "Форумная викторина",
      "Турнир",
      "Конкурс Прогнозистов",
      "Конкурс",
    ],
  );
});

test("normalizes legacy projects without activity types to defaults without sharing mutable state", () => {
  const firstRead = normalizeProjectActivityTypes(undefined);
  firstRead[0].enabled = false;

  const secondRead = normalizeProjectActivityTypes(undefined);

  assert.equal(secondRead[0].enabled, true);
});

test("keeps saved settings and appends defaults for newly introduced activity types", () => {
  const saved = createDefaultProjectActivityTypes();
  saved.splice(-2);
  saved[0].defaultTitle = "Сохранённая карта";

  const normalized = normalizeProjectActivityTypes(saved);
  normalized[0].defaultTitle = "Изменение read model";

  assert.equal(saved[0].defaultTitle, "Сохранённая карта");
  assert.deepEqual(normalized.slice(-2), [
    { type: "forecast_contest", defaultTitle: "Конкурс Прогнозистов", enabled: true },
    { type: "contest", defaultTitle: "Конкурс", enabled: true },
  ]);
});
