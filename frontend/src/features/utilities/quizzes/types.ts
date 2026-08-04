import type { ProjectResource } from "../../projects/types";
import type { ResourceAmount } from "../../rewards/types";

export type QuizStatus = "draft" | "ready";
export type QuizEventStatus = "draft" | "active" | "paused" | "completed" | "cancelled";
export type QuizAnswerStatus = "pending" | "accepted" | "rejected";
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
export interface Quiz { id: string; configId: string; name: string; description: string; status: QuizStatus; questions: QuizQuestion[]; effectiveMessageTemplates: QuizMessageTemplates; effectiveAnswerMessageTemplates: QuizMessageTemplates; resources: ProjectResource[]; configRulesSnapshot: { configName: string; defaultRegularRule: QuizRegularRule }; createdByUserId: string; validationIssues: QuizValidationIssue[]; }
export interface QuizAward { playerName: string; resolvedRewards: ResourceAmount[]; source: { kind: string }; }
export interface QuizChatPreviewCandidate {
  sourceLineNumber: number;
  playerName: string;
  rawMessage: string;
  transport: "direct" | "clan";
  canonicalKey: string;
}
export interface QuizEventQuestion { id: string; questionIndex: number; questionTitle: string | null; questionText: string; status: "pending" | "active" | "completed" | "skipped"; generatedMessage: string; generatedAnswerMessage: string; message: { messageTextOverride: string | null; answerTextOverride: string | null }; chatFragments: Array<{ id: string; rawText: string; mode: "append" | "replace"; isActive: boolean; insertedAt: string }>; answers: Array<{ id: string; fragmentId: string; playerName: string; rawMessage: string; isActive: boolean; status: QuizAnswerStatus; position: number | null; awards: QuizAward[] }>; awards: QuizAward[]; }
export interface QuizEvent { id: string; quizId: string; name: string; hostUserId: string; hostSnapshot: { nickname: string }; status: QuizEventStatus; currentQuestionId: string | null; createdAt: string; updatedAt: string; questions: QuizEventQuestion[]; quizSnapshot: { resources: ProjectResource[] }; summary: { players: Array<{ playerName: string; correctAnswers: number; regularRewards: ResourceAmount[]; bonusRewards: ResourceAmount[]; totalRewards: ResourceAmount[] }>; totalRewards: ResourceAmount[]; completedQuestions: number; totalQuestions: number; totalUniqueCorrectAnswers: number } | null; }
