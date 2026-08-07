import type {
  Quiz,
  QuizChatMutationResult,
  QuizConfig,
  QuizEvent,
  SaveQuizQuestionResult,
} from "../types";
import type {
  QuizApiView,
  QuizChatMutationApiResult,
  QuizConfigApiView,
  QuizEventApiView,
  SaveQuizQuestionResultApiResult,
} from "../api/quiz.views";

/** Converts the structured Quiz API contract into the existing page models. */
export class QuizViewMapper {
  toConfig(view: QuizConfigApiView): QuizConfig {
    return {
      id: view.id,
      name: view.content.name,
      description: view.content.description,
      status: view.meta.status,
      questionCount: view.content.questionCount,
      defaultRegularRule: view.configuration.defaultRegularRule,
      regularRewardOverrides: view.configuration.regularRewardOverrides,
      bonusRules: view.configuration.bonusRules,
      messageTemplates: view.configuration.messageTemplates,
      answerMessageTemplates: view.configuration.answerMessageTemplates,
      isSystem: view.meta.isSystem,
      createdByUserId: view.meta.createdByUserId,
      createdByNickname: view.meta.createdByNickname,
      updatedByUserId: view.meta.updatedByUserId,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      validationIssues: view.validation.issues,
    };
  }

  toQuiz(view: QuizApiView): Quiz {
    return {
      id: view.id,
      configId: view.meta.configId,
      eventId: view.meta.eventId,
      name: view.content.name,
      description: view.content.description,
      status: view.meta.status,
      questions: view.content.questions,
      effectiveMessageTemplates: view.configuration.effectiveMessageTemplates,
      effectiveAnswerMessageTemplates: view.configuration.effectiveAnswerMessageTemplates,
      resources: view.configuration.resources,
      configRulesSnapshot: view.configuration.configRulesSnapshot,
      createdByUserId: view.meta.createdByUserId,
      createdByNickname: view.meta.createdByNickname,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      validationIssues: view.validation.issues,
    };
  }

  toEvent(view: QuizEventApiView): QuizEvent {
    return {
      id: view.id,
      quizId: view.meta.quizId,
      name: view.meta.name,
      hostUserId: view.meta.hostUserId,
      hostSnapshot: { nickname: view.meta.hostSnapshot.nickname },
      status: view.meta.status,
      revision: view.meta.revision,
      completedAt: view.meta.completedAt,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      questions: view.state.questions.map((question) => ({
        id: question.id,
        questionIndex: question.content.questionIndex,
        conductedOrder: question.workflow.conductedOrder,
        reviewedAt: question.workflow.reviewedAt,
        reviewedByUserId: question.workflow.reviewedByUserId,
        questionTitle: question.content.title,
        questionText: question.content.text,
        generatedMessage: question.messages.generatedQuestion,
        generatedAnswerMessage: question.messages.generatedAnswer,
        message: question.messages.overrides,
        chat: {
          rawText: question.chat.rawText,
          updatedAt: question.chat.updatedAt,
          updatedByUserId: question.chat.updatedByUserId,
        },
        playerGroups: question.chat.playerGroups,
        ranking: question.result.ranking,
        awards: question.result.awards,
      })),
      conductedQuestionsCount: view.state.progress.conductedQuestionsCount,
      reviewedQuestionsCount: view.state.progress.reviewedQuestionsCount,
      preparedQuestionsCount: view.state.progress.preparedQuestionsCount,
      firstUnconductedQuestionId: view.state.progress.firstUnconductedQuestionId,
      quizSnapshot: { resources: view.configuration.resources },
      summary: view.state.summary,
    };
  }

  toChatMutationResult(view: QuizChatMutationApiResult): QuizChatMutationResult {
    return { event: this.toEvent(view.event), mutation: view.mutation };
  }

  toQuestionResult(view: SaveQuizQuestionResultApiResult): SaveQuizQuestionResult {
    return { event: this.toEvent(view.event), result: view.result };
  }
}

export const quizViewMapper = new QuizViewMapper();
