import assert from "node:assert/strict";
import test from "node:test";
import { createAnalyticsSourceKey } from "./sourceTypes";

test("creates project-scoped source keys without separator collisions", () => {
  assert.notEqual(
    createAnalyticsSourceKey({ projectId: "project:one", kind: "game", sourceId: "journey:1" }),
    createAnalyticsSourceKey({ projectId: "project", kind: "game", sourceId: "one:journey:1" }),
  );
});
