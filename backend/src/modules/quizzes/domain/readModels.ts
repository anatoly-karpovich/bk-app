import type { HostSnapshot } from "../../auth/domain/types";
import type { ResourceSnapshot } from "../../rewards";
import type {
  QuizAward,
  QuizConfigRulesSnapshot,
  QuizEventSummary,
  QuizMessageTemplates,
  QuizPlayerMessageGroupView,
  QuizQuestion,
  QuizQuestionMessageState,
  QuizRankedAnswerView,
  QuizRegularRewardOverride,
  QuizRegularRewardRule,
  QuizBonusRewardRule,
  QuizValidationIssue,
} from "./types";

export interface QuizConfigView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    status: "draft" | "ready";
        isSystem: boolean;
        createdByUserId: string;
        createdByNickname: string | null;
        updatedByUserId: string;
  };
  content: { name: string; description: string; questionCount: number | null };
  configuration: {
    defaultRegularRule: QuizRegularRewardRule | null;
    regularRewardOverrides: QuizRegularRewardOverride[];
    bonusRules: QuizBonusRewardRule[];
    limitOneBonusPerPlayer: boolean;
    messageTemplates: QuizMessageTemplates | null;
    answerMessageTemplates: QuizMessageTemplates | null;
  };
  validation: { issues: QuizValidationIssue[] };
}

export interface QuizView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    configId: string;
    eventId: string | null;
        status: "draft" | "ready";
        createdByUserId: string;
        createdByNickname: string | null;
        updatedByUserId: string;
  };
  content: { name: string; description: string; questions: QuizQuestion[] };
  configuration: {
    resources: ResourceSnapshot[];
    configRulesSnapshot: QuizConfigRulesSnapshot;
    effectiveMessageTemplates: QuizMessageTemplates;
    effectiveAnswerMessageTemplates: QuizMessageTemplates;
  };
  validation: { issues: QuizValidationIssue[] };
}

export interface QuizEventQuestionView {
  id: string;
  content: { questionIndex: number; title: string | null; text: string };
  workflow: {
    conductedOrder: number | null;
    reviewedAt: string | null;
    reviewedByUserId: string | null;
  };
  messages: {
    generatedQuestion: string;
    generatedAnswer: string;
    overrides: QuizQuestionMessageState;
  };
  chat: {
    rawText: string;
    updatedAt: string | null;
    updatedByUserId: string | null;
    playerGroups: QuizPlayerMessageGroupView[];
  };
  result: { ranking: QuizRankedAnswerView[]; awards: QuizAward[] };
}

export interface QuizEventView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    quizId: string;
    name: string;
    status: "open" | "completed";
    revision: number;
    completedAt: string | null;
    hostUserId: string;
    hostSnapshot: HostSnapshot;
  };
  configuration: {
    sourceQuiz: {
      quizId: string;
      configId: string;
      quizName: string;
      quizDescription: string;
      capturedAt: string;
    };
    resources: ResourceSnapshot[];
    configRulesSnapshot: QuizConfigRulesSnapshot;
  };
  state: {
    progress: {
      preparedQuestionsCount: number;
      conductedQuestionsCount: number;
      reviewedQuestionsCount: number;
      firstUnconductedQuestionId: string | null;
    };
    questions: QuizEventQuestionView[];
    summary: QuizEventSummary | null;
  };
}
