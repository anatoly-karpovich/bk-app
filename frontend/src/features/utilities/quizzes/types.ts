import type { ProjectResource } from "../../projects/types";
import type { ResourceAmount, ResourceDefinition } from "../../rewards/types";

export type QuizStatus = "draft" | "ready";
export type QuizEventStatus = "open" | "completed";
export type QuizMessageKind = "question" | "answer";
export interface QuizValidationIssue { path: string; message: string; }
export interface QuizMessageTemplate { template: string; variables: { emojiStart?: string; emojiEnd?: string }; }
export interface QuizMessageTemplates { defaultTemplate: QuizMessageTemplate; questionOverrides: Array<{ questionIndex: number; template: QuizMessageTemplate }>; }
export type QuizRewardPool = { mode: "all"; rewards: ResourceAmount[] };
export type QuizRegularRule =
  | { mode: "all_accepted"; rewardPool: QuizRewardPool }
  | { mode: "by_position"; positionRewards: Array<{ position: number; rewardPool: QuizRewardPool }> };
export interface QuizRegularRewardOverride { questionIndex: number; rule: QuizRegularRule; }
export interface QuizBonusRule { id: string; questionIndex: number; position: number; rewardPool: QuizRewardPool; }
export interface QuizConfig { id: string; name: string; description: string; status: QuizStatus; questionCount: number | null; defaultRegularRule: QuizRegularRule | null; regularRewardOverrides: QuizRegularRewardOverride[]; bonusRules: QuizBonusRule[]; messageTemplates: QuizMessageTemplates | null; answerMessageTemplates: QuizMessageTemplates | null; isSystem: boolean; createdByUserId: string; validationIssues: QuizValidationIssue[]; }
export interface QuizQuestion { id: string; questionIndex: number; title: string | null; text: string; correctAnswer: string | null; attachmentUrl: string | null; notes: string | null; }
export interface QuizQuestionDraft {
  id: string;
  questionIndex: number;
  text: string;
  correctAnswer: string | null;
  notes: string | null;
}
export interface CreateQuizInput {
  configId: string;
  name: string;
  description: string;
  questions: QuizQuestionDraft[];
}
export interface Quiz { id: string; configId: string; eventId: string | null; name: string; description: string; status: QuizStatus; questions: QuizQuestion[]; effectiveMessageTemplates: QuizMessageTemplates; effectiveAnswerMessageTemplates: QuizMessageTemplates; resources: ProjectResource[]; configRulesSnapshot: { configName: string; defaultRegularRule: QuizRegularRule }; createdByUserId: string; createdAt: string; updatedAt: string; validationIssues: QuizValidationIssue[]; }
export interface QuizAwardSource {
  kind: "regular_all" | "regular_position" | "bonus_position";
  questionIndex: number;
  conductedOrder: number;
  position: number | null;
  regularRuleMode: QuizRegularRule["mode"] | null;
  bonusRuleId: string | null;
}
export interface QuizAward { id: string; selectedMessageId: string; playerName: string; questionIndex: number; source: QuizAwardSource; rewards: ResourceAmount[]; awardedAt: string; }
export interface QuizChatMessageView { id: string; text: string; timestamp: string | null; effectiveOrder: number; transport: "direct" | "clan"; }
export interface QuizPlayerMessageGroup { playerName: string; selectedMessageId: string | null; messages: QuizChatMessageView[]; }
export interface QuizRanking { playerName: string; selectedMessageId: string; timestamp: string | null; effectiveOrder: number; position: number; }
export interface QuizQuestionChat { rawText: string; updatedAt: string | null; updatedByUserId: string | null; }
export interface QuizEventQuestion {
  id: string;
  questionIndex: number;
  conductedOrder: number | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  questionTitle: string | null;
  questionText: string;
  generatedMessage: string;
  generatedAnswerMessage: string;
  message: {
    messageTextOverride: string | null;
    messageTextUpdatedAt: string | null;
    messageTextUpdatedByUserId: string | null;
    answerTextOverride: string | null;
    answerTextUpdatedAt: string | null;
    answerTextUpdatedByUserId: string | null;
  };
  chat: QuizQuestionChat;
  playerGroups: QuizPlayerMessageGroup[];
  ranking: QuizRanking[];
  awards: QuizAward[];
}
export interface QuizEventSummary {
  players: Array<{ playerName: string; correctAnswers: number; regularRewards: ResourceAmount[]; bonusRewards: ResourceAmount[]; totalRewards: ResourceAmount[] }>;
  totalPreparedQuestions: number;
  totalConductedQuestions: number;
  totalReviewedQuestions: number;
  totalSelectedAnswers: number;
  totalUniquePlayers: number;
  totalRewards: ResourceAmount[];
  generatedAt: string;
}
export interface QuizEvent {
  id: string;
  quizId: string;
  name: string;
  hostUserId: string;
  hostSnapshot: { nickname: string };
  status: QuizEventStatus;
  revision: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questions: QuizEventQuestion[];
  conductedQuestionsCount: number;
  reviewedQuestionsCount: number;
  preparedQuestionsCount: number;
  firstUnconductedQuestionId: string | null;
  quizSnapshot: { resources: ResourceDefinition[] };
  summary: QuizEventSummary | null;
}
export interface QuizChatMutationResult {
  event: QuizEvent;
  mutation: {
    parsedMessagesCount: number;
    candidateMessagesCount: number;
    duplicateMessagesCount: number;
    previousMessagesCount: number;
    nextMessagesCount: number;
    removedPersistedSelectionsCount: number;
    effectiveChange: boolean;
  };
}
export interface SaveQuizQuestionResult {
  event: QuizEvent;
  result: { conductedOrder: number; awardsCount: number; reviewedAt: string };
}
export interface QuizAnswerSelectionDraftItem { isSelected: boolean; selectedMessageId: string | null; }
export type QuizAnswerSelectionDraft = Record<string, QuizAnswerSelectionDraftItem>;
