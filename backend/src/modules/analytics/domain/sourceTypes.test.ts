import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_ACTIVITY_SOURCE_TYPES,
  ANALYTICS_SOURCE_TYPES,
  createAnalyticsSourceKey,
  isAnalyticsSourcePair,
} from "./sourceTypes";

test("creates project-scoped source keys without separator collisions", () => {
  assert.notEqual(
    createAnalyticsSourceKey({ projectId: "project:one", kind: "game", sourceId: "journey:1" }),
    createAnalyticsSourceKey({ projectId: "project", kind: "game", sourceId: "one:journey:1" }),
  );
});

test("defines all ten stable analytics categories", () => {
  assert.deepEqual(ANALYTICS_SOURCE_TYPES, [
    "journey",
    "battleships",
    "lotto",
    "lotto_bingo",
    "quiz",
    "memes",
    "forum_quiz",
    "tournament",
    "forecast_contest",
    "contest",
  ]);
  assert.deepEqual(ANALYTICS_ACTIVITY_SOURCE_TYPES, ANALYTICS_SOURCE_TYPES);
});

test("validates source kind and category combinations from the shared matrix", () => {
  for (const type of ANALYTICS_ACTIVITY_SOURCE_TYPES) {
    assert.equal(isAnalyticsSourcePair("activity", type), true);
  }

  assert.equal(isAnalyticsSourcePair("game", "tournament"), true);
  assert.equal(isAnalyticsSourcePair("activity", "tournament"), true);
  assert.equal(isAnalyticsSourcePair("quiz_event", "quiz"), true);
  assert.equal(isAnalyticsSourcePair("game", "quiz"), false);
  assert.equal(isAnalyticsSourcePair("quiz_event", "lotto"), false);
  assert.equal(isAnalyticsSourcePair("activity", "memes"), true);
  assert.equal(isAnalyticsSourcePair("activity", "forecast_contest"), true);
  assert.equal(isAnalyticsSourcePair("activity", "contest"), true);
  assert.equal(isAnalyticsSourcePair("game", "forecast_contest"), false);
  assert.equal(isAnalyticsSourcePair("game", "contest"), false);
});
