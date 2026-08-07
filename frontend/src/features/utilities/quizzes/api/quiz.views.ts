import type { ResourceDefinition } from "../../../rewards/types";
import type {
  QuizAward,
  QuizConfig,
  QuizEventSummary,
  QuizMessageTemplates,
  QuizPlayerMessageGroup,
  QuizQuestion,
  QuizRanking,
  QuizRegularRule,
  QuizValidationIssue,
} from "../types";

export interface QuizConfigApiView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    status: QuizConfig["status"];
    isSystem: boolean;
    createdByUserId: string;
    createdByNickname: string | null;
    updatedByUserId: string;
  };
  content: { name: string; description: string; questionCount: number | null };
  configuration: {
    defaultRegularRule: QuizRegularRule | null;
    regularRewardOverrides: QuizConfig["regularRewardOverrides"];
    bonusRules: QuizConfig["bonusRules"];
    messageTemplates: QuizMessageTemplates | null;
    answerMessageTemplates: QuizMessageTemplates | null;
  };
  validation: { issues: QuizValidationIssue[] };
}

export interface QuizApiView {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    projectId: string;
    configId: string;
    eventId: string | null;
    status: QuizConfig["status"];
    createdByUserId: string;
    createdByNickname: string | null;
    updatedByUserId: string;
  };
  content: { name: string; description: string; questions: QuizQuestion[] };
  configuration: {
    resources: ResourceDefinition[];
    configRulesSnapshot: {
      configId: string;
      configName: string;
      questionCount: number;
      defaultRegularRule: QuizRegularRule;
      regularRewardOverrides: QuizConfig["regularRewardOverrides"];
      bonusRules: QuizConfig["bonusRules"];
      messageTemplates: QuizMessageTemplates;
      answerMessageTemplates: QuizMessageTemplates;
      capturedAt: string;
      schemaVersion: 1;
    };
    effectiveMessageTemplates: QuizMessageTemplates;
    effectiveAnswerMessageTemplates: QuizMessageTemplates;
  };
  validation: { issues: QuizValidationIssue[] };
}

export interface QuizEventApiView {
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
    hostSnapshot: { userId: string; displayName: string; nickname: string };
  };
  configuration: {
    sourceQuiz: { quizId: string; configId: string; quizName: string; quizDescription: string; capturedAt: string };
    resources: ResourceDefinition[];
    configRulesSnapshot: QuizApiView["configuration"]["configRulesSnapshot"];
  };
  state: {
    progress: {
      preparedQuestionsCount: number;
      conductedQuestionsCount: number;
      reviewedQuestionsCount: number;
      firstUnconductedQuestionId: string | null;
    };
    questions: Array<{
      id: string;
      content: { questionIndex: number; title: string | null; text: string };
      workflow: { conductedOrder: number | null; reviewedAt: string | null; reviewedByUserId: string | null };
      messages: {
        generatedQuestion: string;
        generatedAnswer: string;
        overrides: import("../types").QuizEventQuestion["message"];
      };
      chat: {
        rawText: string;
        updatedAt: string | null;
        updatedByUserId: string | null;
        playerGroups: QuizPlayerMessageGroup[];
      };
      result: { ranking: QuizRanking[]; awards: QuizAward[] };
    }>;
    summary: QuizEventSummary | null;
  };
}

export interface QuizChatMutationApiResult {
  event: QuizEventApiView;
  mutation: import("../types").QuizChatMutationResult["mutation"];
}

export interface SaveQuizQuestionResultApiResult {
  event: QuizEventApiView;
  result: import("../types").SaveQuizQuestionResult["result"];
}
