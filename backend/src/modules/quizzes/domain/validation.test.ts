import assert from "node:assert/strict";
import test from "node:test";
import type { ProjectResource } from "../../projects/domain/types";
import { validateQuizConfig } from "./validation";
import type { QuizConfigDocument } from "./types";

const resources: ProjectResource[] = [
  {
    id: "coins",
    code: "coins",
    name: "Coins",
    label: "монет",
    type: "currency",
    valueType: "integer",
    precision: 0,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
  },
];
const validConfig = (): QuizConfigDocument => ({
  projectId: "project",
  name: "Config",
  description: "",
  status: "draft",
  questionCount: 1,
  defaultRegularRule: {
    mode: "all_accepted",
    rewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 1 }] },
  },
  regularRewardOverrides: [],
  bonusRules: [],
  messageTemplates: { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] },
  answerMessageTemplates: { defaultTemplate: { template: "{correctAnswer}", variables: {} }, questionOverrides: [] },
  isSystem: false,
  createdByUserId: "host",
  updatedByUserId: "host",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  schemaVersion: 1,
});

test("accepts a ready config and reports unsupported template placeholders", () => {
  assert.deepEqual(validateQuizConfig(validConfig(), resources), []);
  const invalid = validConfig();
  invalid.messageTemplates!.defaultTemplate.template = "{unknown}";
  assert.match(validateQuizConfig(invalid, resources)[0].message, /Неизвестный placeholder/);
});

test("rejects duplicate bonus places for one conducted question", () => {
  const invalid = validConfig();
  invalid.bonusRules = [
    {
      id: "first",
      questionIndex: 1,
      position: 1,
      rewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 1 }] },
    },
    {
      id: "another-first",
      questionIndex: 1,
      position: 1,
      rewardPool: { mode: "all", rewards: [{ resourceId: "coins", amount: 2 }] },
    },
  ];
  assert.ok(validateQuizConfig(invalid, resources).some((issue) => issue.path === "bonusRules.1.position"));
});
