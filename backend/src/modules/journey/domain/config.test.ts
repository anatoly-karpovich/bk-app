import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_JOURNEY_RULES, normalizeJourneyRules, validateJourneyRules } from "./config";

test("normalizes legacy Journey cell ids and empty map labels before validating a config", () => {
  const rules = normalizeJourneyRules({
    ...structuredClone(DEFAULT_JOURNEY_RULES),
    cells: DEFAULT_JOURNEY_RULES.cells.map((cell) => ({
      ...cell,
      id: `${cell.kind}_${cell.id}`,
      mapLabel: "",
    })),
  });

  assert.deepEqual(rules.cells.map((cell) => ({ id: cell.id, mapLabel: cell.mapLabel })), [
    { id: "small", mapLabel: "S" },
    { id: "medium", mapLabel: "M" },
    { id: "large", mapLabel: "L" },
    { id: "large", mapLabel: "L" },
    { id: "medium", mapLabel: "M" },
    { id: "small", mapLabel: "S" },
  ]);
  validateJourneyRules(rules, [{ id: "default", code: "default", name: "Default", label: "Default", type: "currency", valueType: "integer", precision: 0 }]);
});
