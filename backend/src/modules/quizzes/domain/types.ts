import type { AllRewardPool, ResourceAmount, ResourceSnapshot } from "../../rewards";
import type { HostSnapshot } from "../../auth/domain/types";

export type QuizConfigStatus = "draft" | "ready";
export type QuizStatus = "draft" | "ready";
export type QuizEventStatus = "draft" | "active" | "paused" | "completed" | "cancelled";
export type QuizEventQuestionStatus = "pending" | "active" | "completed" | "skipped";
export type QuizAnswerStatus = "pending" | "accepted" | "rejected";
export type QuizMessageKind = "question" | "answer";

export type QuizRewardPool = AllRewardPool;

export interface QuizAllAcceptedRewardRule {
  mode: "all_accepted";
  rewardPool: QuizRewardPool;
}

export interface QuizPositionReward {
  position: number;
  rewardPool: QuizRewardPool;
}

export interface QuizPositionRewardRule {
  mode: "by_position";
  positionRewards: QuizPositionReward[];
}

export type QuizRegularRewardRule = QuizAllAcceptedRewardRule | QuizPositionRewardRule;

export interface QuizRegularRewardOverride {
  questionIndex: number;
  rule: QuizRegularRewardRule;
}

export interface QuizBonusRewardRule {
  id: string;
  questionIndex: number;
  position: number;
  rewardPool: QuizRewardPool;
}

export interface QuizMessageTemplate {
  template: string;
  variables: { emojiStart?: string; emojiEnd?: string };
}

export interface QuizMessageTemplateOverride {
  questionIndex: number;
  template: QuizMessageTemplate;
}

export interface QuizMessageTemplates {
  defaultTemplate: QuizMessageTemplate;
  questionOverrides: QuizMessageTemplateOverride[];
}

export interface QuizValidationIssue {
  path: string;
  message: string;
}

export interface QuizConfigDocument {
  projectId: string;
  name: string;
  description: string;
  status: QuizConfigStatus;
  questionCount: number | null;
  defaultRegularRule: QuizRegularRewardRule | null;
  regularRewardOverrides: QuizRegularRewardOverride[];
  bonusRules: QuizBonusRewardRule[];
  messageTemplates: QuizMessageTemplates | null;
  answerMessageTemplates: QuizMessageTemplates | null;
  isSystem: boolean;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface QuizConfigView extends QuizConfigDocument {
  id: string;
  validationIssues: QuizValidationIssue[];
}

export interface QuizConfigRulesSnapshot {
  configId: string;
  configName: string;
  questionCount: number;
  defaultRegularRule: QuizRegularRewardRule;
  regularRewardOverrides: QuizRegularRewardOverride[];
  bonusRules: QuizBonusRewardRule[];
  messageTemplates: QuizMessageTemplates;
  answerMessageTemplates: QuizMessageTemplates;
  capturedAt: string;
  schemaVersion: 1;
}

export interface QuizQuestion {
  id: string;
  questionIndex: number;
  title: string | null;
  text: string;
  correctAnswer: string | null;
  attachmentUrl: string | null;
  notes: string | null;
}

export interface QuizDocument {
  projectId: string;
  configId: string;
  configRulesSnapshot: QuizConfigRulesSnapshot;
  resources: ResourceSnapshot[];
  name: string;
  description: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  effectiveMessageTemplates: QuizMessageTemplates;
  effectiveAnswerMessageTemplates: QuizMessageTemplates;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface QuizView extends QuizDocument {
  id: string;
  validationIssues: QuizValidationIssue[];
}

export interface QuizSnapshot {
  quizId: string;
  configId: string;
  quizName: string;
  quizDescription: string;
  configRulesSnapshot: QuizConfigRulesSnapshot;
  resources: ResourceSnapshot[];
  questions: QuizQuestion[];
  effectiveMessageTemplates: QuizMessageTemplates;
  effectiveAnswerMessageTemplates: QuizMessageTemplates;
  capturedAt: string;
  schemaVersion: 1;
}

export interface QuizChatFragment {
  id: string;
  rawText: string;
  mode: "replace" | "append";
  isActive: boolean;
  insertedAt: string;
  insertedByUserId: string;
}

export interface QuizAnswer {
  id: string;
  fragmentId: string;
  sourceLineNumber: number;
  canonicalKey: string;
  playerName: string;
  rawMessage: string;
  transport: "direct" | "clan";
  order: number;
  status: QuizAnswerStatus;
  decidedAt: string | null;
  decidedByUserId: string | null;
}

export interface QuizQuestionMessageState {
  messageTextOverride: string | null;
  messageTextUpdatedAt: string | null;
  messageTextUpdatedByUserId: string | null;
  answerTextOverride: string | null;
  answerTextUpdatedAt: string | null;
  answerTextUpdatedByUserId: string | null;
}

export interface QuizAwardSource {
  kind: "regular_all" | "regular_position" | "bonus_position";
  questionIndex: number;
  position: number | null;
  regularRuleMode: QuizRegularRewardRule["mode"] | null;
  bonusRuleId: string | null;
}

export interface QuizAward {
  id: string;
  answerId: string;
  playerName: string;
  questionIndex: number;
  source: QuizAwardSource;
  resolvedRewards: ResourceAmount[];
  awardedAt: string;
}

export interface QuizEventQuestion {
  id: string;
  quizQuestionId: string;
  questionIndex: number;
  status: QuizEventQuestionStatus;
  message: QuizQuestionMessageState;
  chatFragments: QuizChatFragment[];
  answers: QuizAnswer[];
  awards: QuizAward[];
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface QuizPlayerSummary {
  playerName: string;
  correctAnswers: number;
  regularRewards: ResourceAmount[];
  bonusRewards: ResourceAmount[];
  totalRewards: ResourceAmount[];
}

export interface QuizEventSummary {
  players: QuizPlayerSummary[];
  totalQuestions: number;
  completedQuestions: number;
  totalAcceptedAnswers: number;
  totalUniqueCorrectAnswers: number;
  totalRewards: ResourceAmount[];
  generatedAt: string;
}

export interface QuizEventDocument {
  projectId: string;
  quizId: string;
  quizSnapshot: QuizSnapshot;
  name: string;
  hostUserId: string;
  hostSnapshot: HostSnapshot;
  status: QuizEventStatus;
  currentQuestionId: string | null;
  questions: QuizEventQuestion[];
  summary: QuizEventSummary | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface QuizEventQuestionView extends QuizEventQuestion {
  questionTitle: string | null;
  questionText: string;
  generatedMessage: string;
  generatedAnswerMessage: string;
  answers: Array<QuizAnswer & { position: number | null; awards: QuizAward[] }>;
}

export interface QuizEventView extends Omit<QuizEventDocument, "questions"> {
  id: string;
  questions: QuizEventQuestionView[];
}
