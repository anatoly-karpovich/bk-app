import type { QuizConfigDocument, QuizValidationIssue } from "./domain/types";
import type { QuizConfigView } from "./domain/readModels";

export class QuizConfigReadModelFactory {
  create(id: string, config: QuizConfigDocument, validationIssues: QuizValidationIssue[], createdByNickname: string | null): QuizConfigView {
    return {
      id,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      meta: {
        projectId: config.projectId,
        status: validationIssues.length ? "draft" : "ready",
        isSystem: config.isSystem,
        createdByUserId: config.createdByUserId,
        createdByNickname,
        updatedByUserId: config.updatedByUserId,
      },
      content: { name: config.name, description: config.description, questionCount: config.questionCount },
      configuration: {
        defaultRegularRule: clone(config.defaultRegularRule),
        regularRewardOverrides: clone(config.regularRewardOverrides),
        bonusRules: clone(config.bonusRules),
        limitOneBonusPerPlayer: config.limitOneBonusPerPlayer === true,
        messageTemplates: clone(config.messageTemplates),
        answerMessageTemplates: clone(config.answerMessageTemplates),
      },
      validation: { issues: clone(validationIssues) },
    };
  }
}

const clone = <T>(value: T): T => structuredClone(value);
