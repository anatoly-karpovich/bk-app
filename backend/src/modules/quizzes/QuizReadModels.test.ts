import assert from "node:assert/strict";
import test from "node:test";
import { QuizConfigReadModelFactory } from "./QuizConfigReadModelFactory";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import type { QuizConfigDocument, QuizDocument } from "./domain/types";

const templates = { defaultTemplate: { template: "{questionText}", variables: {} }, questionOverrides: [] };
const rule = { mode: "all_accepted" as const, rewardPool: { mode: "all" as const, rewards: [{ resourceId: "coins", amount: 1 }] } };

test("projects quiz configs into meta, content, configuration, and validation", () => {
  const config: QuizConfigDocument = {
    projectId: "project", name: "Config", description: "Description", status: "ready", questionCount: 1,
    defaultRegularRule: rule, regularRewardOverrides: [], bonusRules: [], messageTemplates: templates,
    answerMessageTemplates: templates, isSystem: false, createdByUserId: "author", updatedByUserId: "editor",
    createdAt: "created", updatedAt: "updated", schemaVersion: 1,
  };

  const view = new QuizConfigReadModelFactory().create("config", config, [], "Автор");

  assert.deepEqual(Object.keys(view).sort(), ["configuration", "content", "createdAt", "id", "meta", "updatedAt", "validation"]);
  assert.equal(view.meta.status, "ready");
  assert.equal(view.meta.createdByNickname, "Автор");
  assert.equal(view.content.name, "Config");
  assert.equal("schemaVersion" in view, false);
});

test("projects quizzes into meta, content, configuration, and validation", () => {
  const quiz: QuizDocument = {
    projectId: "project", configId: "config", eventId: null, name: "Quiz", description: "Description", status: "ready",
    resources: [{ id: "coins", code: "coins", name: "Coins", label: "coins", type: "currency", valueType: "integer", precision: 0 }],
    configRulesSnapshot: { configId: "config", configName: "Config", questionCount: 1, defaultRegularRule: rule, regularRewardOverrides: [], bonusRules: [], messageTemplates: templates, answerMessageTemplates: templates, capturedAt: "captured", schemaVersion: 1 },
    questions: [{ id: "question", questionIndex: 1, title: null, text: "Question", correctAnswer: "Answer", attachmentUrl: null, notes: null }],
    effectiveMessageTemplates: templates, effectiveAnswerMessageTemplates: templates,
    createdByUserId: "author", updatedByUserId: "editor", createdAt: "created", updatedAt: "updated", schemaVersion: 1,
  };

  const view = new QuizReadModelFactory().create("quiz", quiz, [], null);

  assert.deepEqual(Object.keys(view).sort(), ["configuration", "content", "createdAt", "id", "meta", "updatedAt", "validation"]);
  assert.equal(view.meta.configId, "config");
  assert.equal(view.meta.createdByNickname, null);
  assert.equal(view.content.questions[0].correctAnswer, "Answer");
  assert.equal("schemaVersion" in view, false);
});
