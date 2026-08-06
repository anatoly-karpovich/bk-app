import type { ProjectResource } from "../../projects/domain/types";
import type { ResourceSnapshot } from "../../rewards";
import type {
  QuizBonusRewardRule,
  QuizConfigDocument,
  QuizMessageTemplates,
  QuizQuestion,
  QuizRegularRewardRule,
  QuizValidationIssue,
  QuizDocument,
} from "./types";

const ALLOWED_PLACEHOLDERS = new Set([
  "questionNumber", "questionTitle", "questionText", "attachment", "correctAnswer", "quizName", "hostName", "emojiStart", "emojiEnd",
]);

export function validateQuizConfig(config: QuizConfigDocument, resources: ProjectResource[]): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  if (!config.name.trim()) issues.push({ path: "name", message: "Название конфига обязательно" });
  if (!Number.isSafeInteger(config.questionCount) || (config.questionCount ?? 0) < 1) {
    issues.push({ path: "questionCount", message: "Количество вопросов должно быть положительным целым числом" });
  }
  if (!config.defaultRegularRule) {
    issues.push({ path: "defaultRegularRule", message: "Нужно указать правило обычной награды" });
  } else {
    issues.push(...validateRegularRule(config.defaultRegularRule, "defaultRegularRule", resources));
  }

  const questionCount = config.questionCount ?? 0;
  const overrideIndexes = new Set<number>();
  config.regularRewardOverrides.forEach((override, index) => {
    const path = `regularRewardOverrides.${index}`;
    if (!isQuestionIndex(override.questionIndex, questionCount)) issues.push({ path: `${path}.questionIndex`, message: "Номер вопроса вне диапазона" });
    if (overrideIndexes.has(override.questionIndex)) issues.push({ path: `${path}.questionIndex`, message: "Переопределение для номера вопроса уже существует" });
    overrideIndexes.add(override.questionIndex);
    issues.push(...validateRegularRule(override.rule, `${path}.rule`, resources));
  });

  const bonusIds = new Set<string>();
  config.bonusRules.forEach((rule, index) => {
    const path = `bonusRules.${index}`;
    if (!rule.id.trim() || bonusIds.has(rule.id)) issues.push({ path: `${path}.id`, message: "ID бонусного правила должен быть уникальным" });
    bonusIds.add(rule.id);
    if (!isQuestionIndex(rule.questionIndex, questionCount)) issues.push({ path: `${path}.questionIndex`, message: "Номер вопроса вне диапазона" });
    if (!Number.isSafeInteger(rule.position) || rule.position < 1) issues.push({ path: `${path}.position`, message: "Позиция должна быть положительным целым числом" });
    issues.push(...validatePool(rule.rewardPool, `${path}.rewardPool`, resources));
  });
  issues.push(...validateTemplates(config.messageTemplates, "messageTemplates", questionCount));
  issues.push(...validateTemplates(config.answerMessageTemplates, "answerMessageTemplates", questionCount));
  return issues;
}

export function validateQuiz(quiz: QuizDocument): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  const snapshot = quiz.configRulesSnapshot;
  const configForValidation: QuizConfigDocument = {
    projectId: quiz.projectId,
    name: snapshot.configName,
    description: "",
    status: "ready",
    questionCount: snapshot.questionCount,
    defaultRegularRule: snapshot.defaultRegularRule,
    regularRewardOverrides: snapshot.regularRewardOverrides,
    bonusRules: snapshot.bonusRules,
    messageTemplates: snapshot.messageTemplates,
    answerMessageTemplates: snapshot.answerMessageTemplates,
    isSystem: false,
    createdByUserId: "snapshot",
    updatedByUserId: "snapshot",
    createdAt: snapshot.capturedAt,
    updatedAt: snapshot.capturedAt,
    schemaVersion: 1,
  };
  const resources = quiz.resources as ProjectResource[];
  issues.push(...validateQuizConfig(configForValidation, resources).map((issue) => ({ ...issue, path: `configRulesSnapshot.${issue.path}` })));
  if (!quiz.name.trim()) issues.push({ path: "name", message: "Название викторины обязательно" });
  const resourceIds = new Set(quiz.resources.map((resource) => resource.id));
  for (const resourceId of collectResourceIds(snapshot)) {
    if (!resourceIds.has(resourceId)) issues.push({ path: "resources", message: `Нет сохранённого ресурса ${resourceId}` });
  }
  issues.push(...validateQuestions(quiz.questions, snapshot.questionCount));
  issues.push(...validateTemplates(quiz.effectiveMessageTemplates, "effectiveMessageTemplates", snapshot.questionCount));
  issues.push(...validateTemplates(quiz.effectiveAnswerMessageTemplates, "effectiveAnswerMessageTemplates", snapshot.questionCount));
  return issues;
}

export function collectResourceIds(config: Pick<QuizConfigDocument, "defaultRegularRule" | "regularRewardOverrides" | "bonusRules">): Set<string> {
  const ids = new Set<string>();
  const addRule = (rule: QuizRegularRewardRule | null) => {
    if (!rule) return;
    if (rule.mode === "all_accepted") rule.rewardPool.rewards.forEach((reward) => ids.add(reward.resourceId));
    else rule.positionRewards.forEach((entry) => entry.rewardPool.rewards.forEach((reward) => ids.add(reward.resourceId)));
  };
  addRule(config.defaultRegularRule);
  config.regularRewardOverrides.forEach((override) => addRule(override.rule));
  config.bonusRules.forEach((rule) => rule.rewardPool.rewards.forEach((reward) => ids.add(reward.resourceId)));
  return ids;
}

function validateRegularRule(rule: QuizRegularRewardRule, path: string, resources: ProjectResource[]): QuizValidationIssue[] {
  if (rule.mode === "all_accepted") return validatePool(rule.rewardPool, `${path}.rewardPool`, resources);
  const issues: QuizValidationIssue[] = [];
  const positions = new Set<number>();
  if (!rule.positionRewards.length) issues.push({ path: `${path}.positionRewards`, message: "Нужна хотя бы одна позиционная награда" });
  rule.positionRewards.forEach((entry, index) => {
    if (!Number.isSafeInteger(entry.position) || entry.position < 1 || positions.has(entry.position)) {
      issues.push({ path: `${path}.positionRewards.${index}.position`, message: "Позиция должна быть уникальным положительным целым числом" });
    }
    positions.add(entry.position);
    issues.push(...validatePool(entry.rewardPool, `${path}.positionRewards.${index}.rewardPool`, resources));
  });
  return issues;
}

function validatePool(pool: unknown, path: string, resources: ProjectResource[]): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  if (!pool || typeof pool !== "object" || (pool as { mode?: unknown }).mode !== "all") {
    return [{ path, message: "В викторине поддерживается только RewardPool с mode: all" }];
  }
  const rewards = (pool as { rewards?: unknown }).rewards;
  if (!Array.isArray(rewards) || !rewards.length) return [{ path: `${path}.rewards`, message: "Pool должен содержать хотя бы одну награду" }];
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  rewards.forEach((reward, index) => {
    const itemPath = `${path}.rewards.${index}`;
    if (!reward || typeof reward !== "object" || typeof (reward as { resourceId?: unknown }).resourceId !== "string") {
      issues.push({ path: itemPath, message: "Награда должна ссылаться на ресурс" });
      return;
    }
    const resourceId = (reward as { resourceId: string }).resourceId;
    const amount = (reward as { amount?: unknown }).amount;
    const resource = resourcesById.get(resourceId);
    if (!resource) issues.push({ path: `${itemPath}.resourceId`, message: "Ресурс не принадлежит проекту" });
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) issues.push({ path: `${itemPath}.amount`, message: "Количество должно быть положительным числом" });
    if (resource?.type === "item" && !Number.isSafeInteger(amount)) issues.push({ path: `${itemPath}.amount`, message: "Количество предмета должно быть целым" });
    if (resource?.type === "currency" && typeof amount === "number" && !Number.isInteger(amount * 10 ** resource.precision)) {
      issues.push({ path: `${itemPath}.amount`, message: "Количество валюты превышает допустимую точность" });
    }
  });
  return issues;
}

function validateTemplates(templates: QuizMessageTemplates | null, path: string, questionCount: number): QuizValidationIssue[] {
  if (!templates) return [{ path, message: "Набор шаблонов обязателен" }];
  const issues: QuizValidationIssue[] = [];
  const indexes = new Set<number>();
  const validateTemplate = (template: QuizMessageTemplates["defaultTemplate"], templatePath: string) => {
    if (!template?.template?.trim()) issues.push({ path: `${templatePath}.template`, message: "Текст шаблона обязателен" });
    for (const match of template?.template?.matchAll(/\{(\w+)\}/g) ?? []) {
      if (!ALLOWED_PLACEHOLDERS.has(match[1])) issues.push({ path: `${templatePath}.template`, message: `Неизвестный placeholder {${match[1]}}` });
    }
  };
  validateTemplate(templates.defaultTemplate, `${path}.defaultTemplate`);
  templates.questionOverrides.forEach((override, index) => {
    if (!isQuestionIndex(override.questionIndex, questionCount) || indexes.has(override.questionIndex)) {
      issues.push({ path: `${path}.questionOverrides.${index}.questionIndex`, message: "Номер вопроса должен быть уникальным и находиться в диапазоне" });
    }
    indexes.add(override.questionIndex);
    validateTemplate(override.template, `${path}.questionOverrides.${index}.template`);
  });
  return issues;
}

function validateQuestions(questions: QuizQuestion[], questionCount: number): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  if (questions.length !== questionCount) issues.push({ path: "questions", message: "Число вопросов не соответствует конфигу" });
  const indexes = new Set<number>();
  questions.forEach((question, index) => {
    const path = `questions.${index}`;
    if (!question.id) issues.push({ path: `${path}.id`, message: "ID вопроса обязателен" });
    if (!isQuestionIndex(question.questionIndex, questionCount) || indexes.has(question.questionIndex)) issues.push({ path: `${path}.questionIndex`, message: "Номер вопроса должен быть уникальным и находиться в диапазоне" });
    indexes.add(question.questionIndex);
    if (!question.text.trim()) issues.push({ path: `${path}.text`, message: "Текст вопроса обязателен" });
    if (!question.correctAnswer?.trim()) issues.push({ path: `${path}.correctAnswer`, message: "Правильный ответ обязателен" });
    if (question.attachmentUrl && !isHttpUrl(question.attachmentUrl)) issues.push({ path: `${path}.attachmentUrl`, message: "URL вложения некорректен" });
  });
  return issues;
}

function isQuestionIndex(value: number, questionCount: number): boolean {
  return Number.isSafeInteger(value) && value >= 1 && value <= questionCount;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
