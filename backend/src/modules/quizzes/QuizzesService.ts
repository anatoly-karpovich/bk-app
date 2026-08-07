import { randomUUID } from "node:crypto";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess } from "../auth/authorization";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { QuizConfigNotFoundError, QuizConflictError, QuizNotFoundError, QuizValidationError } from "./errors";
import type { QuizCreatorReadFields } from "./QuizCreatorReadProjection";
import { QuizConfigsRepository } from "./QuizConfigsRepository";
import { QuizzesRepository } from "./QuizzesRepository";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import { collectResourceIds, validateQuiz, validateQuizConfig } from "./domain/validation";
import type { QuizConfigDocument, QuizConfigRulesSnapshot, QuizDocument, QuizMessageTemplates, QuizQuestion } from "./domain/types";
import type { QuizView } from "./domain/readModels";

export interface CreateQuizInput {
  configId: string;
  name: string;
  description: string;
  questions: Array<Pick<QuizQuestion, "questionIndex" | "text" | "correctAnswer" | "notes">>;
}
export interface UpdateQuizInput {
  name: string;
  description: string;
  questions: QuizQuestion[];
  effectiveMessageTemplates: QuizMessageTemplates;
  effectiveAnswerMessageTemplates: QuizMessageTemplates;
}

export class QuizzesService {
  constructor(
    private readonly repository: QuizzesRepository,
    private readonly configsRepository: QuizConfigsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly readModels: QuizReadModelFactory,
  ) {}

  async list(actor: CurrentUser, projectId: string): Promise<QuizView[]> {
    assertProjectAccess(actor, projectId);
    await this.getProject(projectId);
    return (await this.repository.findReadByProjectId(projectId)).map((quiz) => this.toView(quiz._id.toHexString(), quiz));
  }

  async get(actor: CurrentUser, projectId: string, quizId: string): Promise<QuizView> {
    assertProjectAccess(actor, projectId);
    const quiz = await this.repository.findReadByIdAndProjectId(quizId, projectId);
    if (!quiz) throw new QuizNotFoundError(quizId);
    return this.toView(quizId, quiz);
  }

  async create(actor: CurrentUser, projectId: string, input: CreateQuizInput): Promise<QuizView> {
    assertProjectAccess(actor, projectId);
    const project = await this.getProject(projectId);
    const config = await this.configsRepository.findByIdAndProjectId(input.configId, projectId);
    if (!config) throw new QuizConfigNotFoundError(input.configId);
    const configIssues = validateQuizConfig(config, project.resources);
    if (configIssues.length) throw new QuizValidationError("Из неготового конфига нельзя создать викторину", configIssues);
    const now = new Date().toISOString();
    const snapshot = this.createRulesSnapshot(input.configId, config, now);
    const resourceIds = collectResourceIds(config);
    const resources = project.resources.filter((resource) => resourceIds.has(resource.id)).map((resource) => structuredClone(resource));
    const quiz: QuizDocument = {
      projectId, configId: input.configId, eventId: null, configRulesSnapshot: snapshot, resources,
      name: input.name.trim(), description: input.description.trim(), status: "draft",
      questions: input.questions.map((question) => ({
        id: randomUUID(),
        questionIndex: question.questionIndex,
        title: null,
        text: question.text,
        correctAnswer: question.correctAnswer,
        attachmentUrl: null,
        notes: question.notes,
      })),
      effectiveMessageTemplates: { ...structuredClone(snapshot.messageTemplates), questionOverrides: [] },
      effectiveAnswerMessageTemplates: { ...structuredClone(snapshot.answerMessageTemplates), questionOverrides: [] },
      createdByUserId: actor.id, updatedByUserId: actor.id, createdAt: now, updatedAt: now, schemaVersion: 1,
    };
    quiz.status = validateQuiz(quiz).length ? "draft" : "ready";
    const created = await this.repository.create(quiz);
    if (!created) throw new Error("Failed to load created quiz");
    return this.get(actor, projectId, created._id.toHexString());
  }

  async update(actor: CurrentUser, projectId: string, quizId: string, input: UpdateQuizInput): Promise<QuizView> {
    assertProjectAccess(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(quizId, projectId);
    if (!current) throw new QuizNotFoundError(quizId);
    assertOwnedByUser(actor, current.createdByUserId);
    if (current.eventId) throw new QuizConflictError("Нельзя изменить викторину, для которой уже создано проведение");
    const next: QuizDocument = {
      ...structuredClone(current), name: input.name.trim(), description: input.description.trim(), questions: structuredClone(input.questions),
      effectiveMessageTemplates: structuredClone(input.effectiveMessageTemplates), effectiveAnswerMessageTemplates: structuredClone(input.effectiveAnswerMessageTemplates),
      updatedByUserId: actor.id, updatedAt: new Date().toISOString(),
    };
    next.status = validateQuiz(next).length ? "draft" : "ready";
    const updated = await this.repository.update(quizId, projectId, next);
    if (!updated) throw new QuizNotFoundError(quizId);
    return this.get(actor, projectId, quizId);
  }

  async delete(actor: CurrentUser, projectId: string, quizId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(quizId, projectId);
    if (!current) throw new QuizNotFoundError(quizId);
    assertOwnedByUser(actor, current.createdByUserId);
    if (current.eventId) throw new QuizConflictError("Нельзя удалить викторину, для которой уже создано проведение");
    if (!await this.repository.delete(quizId, projectId)) throw new QuizNotFoundError(quizId);
  }

  private createRulesSnapshot(configId: string, config: QuizConfigDocument, capturedAt: string): QuizConfigRulesSnapshot {
    if (!config.questionCount || !config.defaultRegularRule || !config.messageTemplates || !config.answerMessageTemplates) {
      throw new QuizValidationError("Конфиг не содержит обязательных правил");
    }
    return {
      configId, configName: config.name, questionCount: config.questionCount, defaultRegularRule: structuredClone(config.defaultRegularRule),
      regularRewardOverrides: structuredClone(config.regularRewardOverrides), bonusRules: structuredClone(config.bonusRules),
      messageTemplates: structuredClone(config.messageTemplates), answerMessageTemplates: structuredClone(config.answerMessageTemplates), capturedAt, schemaVersion: 1,
    };
  }

  private toView(id: string, quiz: QuizDocument & QuizCreatorReadFields): QuizView {
    const validationIssues = validateQuiz(quiz);
    return this.readModels.create(id, quiz, validationIssues, quiz.createdByNickname);
  }

  private async getProject(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);
    return project;
  }
}
