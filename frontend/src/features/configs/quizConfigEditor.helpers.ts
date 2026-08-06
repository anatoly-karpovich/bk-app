import type { QuizConfig, QuizRegularRule } from "../utilities/quizzes/types";
import type { QuizConfigSectionId } from "./types";

export function hasReward(rule: QuizRegularRule | null): boolean {
  if (!rule) return false;
  return rule.mode === "all_accepted"
    ? rule.rewardPool.rewards.some((reward) => reward.amount > 0)
    : rule.positionRewards.some((entry) => entry.rewardPool.rewards.some((reward) => reward.amount > 0));
}

export function getQuizConfigRequiredFields(draft: QuizConfig, labels: { name: string; questionCount: string; regularReward: string; regularRewardPool: string; questionTemplate: string; answerTemplate: string }): string[] {
  const missing: string[] = [];
  if (!draft.name.trim()) missing.push(labels.name);
  if (!Number.isSafeInteger(draft.questionCount) || (draft.questionCount ?? 0) < 1) missing.push(labels.questionCount);
  if (!draft.defaultRegularRule) missing.push(labels.regularReward);
  else if (!hasReward(draft.defaultRegularRule)) missing.push(labels.regularRewardPool);
  if (!draft.messageTemplates?.defaultTemplate.template.trim()) missing.push(labels.questionTemplate);
  if (!draft.answerMessageTemplates?.defaultTemplate.template.trim()) missing.push(labels.answerTemplate);
  return missing;
}

export function getChangedQuizConfigSections(source: QuizConfig, draft: QuizConfig): QuizConfigSectionId[] {
  const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  const values: Array<[QuizConfigSectionId, unknown, unknown]> = [
    ["general", { name: source.name, description: source.description, questionCount: source.questionCount }, { name: draft.name, description: draft.description, questionCount: draft.questionCount }],
    ["rewards", { defaultRegularRule: source.defaultRegularRule, regularRewardOverrides: source.regularRewardOverrides }, { defaultRegularRule: draft.defaultRegularRule, regularRewardOverrides: draft.regularRewardOverrides }],
    ["bonus", source.bonusRules, draft.bonusRules],
    ["messages", { messageTemplates: source.messageTemplates, answerMessageTemplates: source.answerMessageTemplates }, { messageTemplates: draft.messageTemplates, answerMessageTemplates: draft.answerMessageTemplates }],
  ];
  return values.flatMap(([section, left, right]) => equal(left, right) ? [] : [section]);
}
