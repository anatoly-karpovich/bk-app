import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProjectActivityTypes } from "./domain/activityTypes";
import { PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH } from "./domain/types";
import { projectMutationSchema } from "./projects.schemas";

function validProjectInput() {
  return {
    code: "bk",
    name: "BK",
    description: "",
    resources: [
      {
        type: "currency" as const,
        id: "credits",
        code: "credits",
        name: "Кредиты",
        label: "Кредиты",
        valueType: "integer" as const,
        precision: 0,
      },
    ],
    activityTypes: createDefaultProjectActivityTypes(),
  };
}

test("accepts exactly one setting for every stable activity type", () => {
  assert.equal(projectMutationSchema.safeParse(validProjectInput()).success, true);
});

test("rejects missing and duplicate activity type settings", () => {
  const missing = validProjectInput();
  missing.activityTypes.pop();
  assert.equal(projectMutationSchema.safeParse(missing).success, false);

  const duplicate = validProjectInput();
  duplicate.activityTypes[7] = { ...duplicate.activityTypes[7], type: "journey" };
  assert.equal(projectMutationSchema.safeParse(duplicate).success, false);
});

test("uses the named title length limit for activity type settings", () => {
  const input = validProjectInput();
  input.activityTypes[0].defaultTitle = "а".repeat(PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH + 1);

  assert.equal(projectMutationSchema.safeParse(input).success, false);
});
