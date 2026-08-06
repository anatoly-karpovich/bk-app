import type { QuizDocument, QuizValidationIssue } from "./domain/types";
import type { QuizView } from "./domain/readModels";

export class QuizReadModelFactory {
  create(id: string, quiz: QuizDocument, validationIssues: QuizValidationIssue[]): QuizView {
    return {
      id,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      meta: {
        projectId: quiz.projectId,
        configId: quiz.configId,
        eventId: quiz.eventId,
        status: validationIssues.length ? "draft" : "ready",
        createdByUserId: quiz.createdByUserId,
        updatedByUserId: quiz.updatedByUserId,
      },
      content: { name: quiz.name, description: quiz.description, questions: clone(quiz.questions) },
      configuration: {
        resources: clone(quiz.resources),
        configRulesSnapshot: clone(quiz.configRulesSnapshot),
        effectiveMessageTemplates: clone(quiz.effectiveMessageTemplates),
        effectiveAnswerMessageTemplates: clone(quiz.effectiveAnswerMessageTemplates),
      },
      validation: { issues: clone(validationIssues) },
    };
  }
}

const clone = <T>(value: T): T => structuredClone(value);
