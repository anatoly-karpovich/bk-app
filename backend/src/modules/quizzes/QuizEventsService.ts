import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { QuizNotFoundError } from "./errors";
import { QuizChatParser } from "./QuizChatParser";
import { QuizEventEngine } from "./QuizEventEngine";
import { QuizEventsRepository } from "./QuizEventsRepository";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import { QuizzesRepository } from "./QuizzesRepository";
import { validateQuiz } from "./domain/validation";
import type { QuizAnswerStatus, QuizEventDocument, QuizEventView, QuizMessageKind, QuizSnapshot } from "./domain/types";

export class QuizEventsService {
  constructor(private readonly repository: QuizEventsRepository, private readonly quizzesRepository: QuizzesRepository, private readonly projectsRepository: ProjectsRepository, private readonly engine: QuizEventEngine, private readonly parser: QuizChatParser, private readonly readModels: QuizReadModelFactory) {}

  async list(actor: CurrentUser, projectId: string): Promise<QuizEventView[]> { assertProjectAccess(actor, projectId); await this.project(projectId); return (await this.repository.findByProjectId(projectId)).map((event) => this.readModels.create(event._id.toHexString(), event)); }
  async get(actor: CurrentUser, projectId: string, eventId: string): Promise<QuizEventView> { assertProjectAccess(actor, projectId); return this.serialize(projectId, eventId); }

  async create(actor: CurrentUser, projectId: string, quizId: string, input: { name?: string }): Promise<QuizEventView> {
    assertProjectAccess(actor, projectId);
    const quiz = await this.quizzesRepository.findByIdAndProjectId(quizId, projectId);
    if (!quiz) throw new QuizNotFoundError(quizId);
    if (validateQuiz(quiz).length) throw new Error("Из неготовой викторины нельзя создать проведение");
    const event = this.engine.create(this.snapshot(quizId, quiz), getHostSnapshot(actor, projectId), input.name?.trim() || quiz.name);
    event.projectId = projectId;
    const created = await this.repository.create(event);
    if (!created) throw new Error("Failed to load created quiz event");
    return this.readModels.create(created._id.toHexString(), created);
  }

  async delete(actor: CurrentUser, projectId: string, eventId: string): Promise<void> { const event = await this.editableEvent(actor, projectId, eventId); if (!await this.repository.delete(eventId, projectId)) throw new Error("Quiz event was not deleted"); }
  async start(actor: CurrentUser, projectId: string, eventId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.start(event)); }
  async pause(actor: CurrentUser, projectId: string, eventId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.pause(event)); }
  async resume(actor: CurrentUser, projectId: string, eventId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.resume(event)); }
  async complete(actor: CurrentUser, projectId: string, eventId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.completeEvent(event)); }
  async cancel(actor: CurrentUser, projectId: string, eventId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.cancel(event)); }
  async startQuestion(actor: CurrentUser, projectId: string, eventId: string, questionId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.startQuestion(event, questionId)); }
  async completeQuestion(actor: CurrentUser, projectId: string, eventId: string, questionId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.completeQuestion(event, questionId)); }
  async skipQuestion(actor: CurrentUser, projectId: string, eventId: string, questionId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.skipQuestion(event, questionId)); }
  async restoreQuestion(actor: CurrentUser, projectId: string, eventId: string, questionId: string) { return this.mutate(actor, projectId, eventId, (event) => this.engine.restoreQuestion(event, questionId)); }
  async reorder(actor: CurrentUser, projectId: string, eventId: string, questionIds: string[]) { return this.mutate(actor, projectId, eventId, (event) => this.engine.reorder(event, questionIds)); }
  async setMessage(actor: CurrentUser, projectId: string, eventId: string, questionId: string, kind: QuizMessageKind, text: string | null) { return this.mutate(actor, projectId, eventId, (event) => this.engine.setMessage(event, questionId, kind, text, actor.id)); }
  async addFragment(actor: CurrentUser, projectId: string, eventId: string, questionId: string, mode: "append" | "replace", rawText: string) {
    return this.mutate(actor, projectId, eventId, (event) => this.engine.appendAnswers(event, questionId, { mode, rawText, insertedByUserId: actor.id, parsed: this.parser.parse({ rawText, hostNickname: event.hostSnapshot.nickname }) }));
  }
  async setAnswerStatus(actor: CurrentUser, projectId: string, eventId: string, questionId: string, answerIds: string[], status: QuizAnswerStatus) { return this.mutate(actor, projectId, eventId, (event) => this.engine.changeAnswerStatus(event, questionId, answerIds, status, actor.id)); }

  private async mutate(actor: CurrentUser, projectId: string, eventId: string, mutation: (event: QuizEventDocument) => QuizEventDocument): Promise<QuizEventView> {
    const event = await this.editableEvent(actor, projectId, eventId);
    const updated = await this.repository.update(eventId, projectId, mutation(structuredClone(event)));
    if (!updated) throw new Error("Quiz event was not saved");
    return this.readModels.create(eventId, updated);
  }
  private async editableEvent(actor: CurrentUser, projectId: string, eventId: string) { assertProjectAccess(actor, projectId); const event = await this.repository.findByIdAndProjectId(eventId, projectId); if (!event) throw new Error("Quiz event was not found"); assertOwnedByUser(actor, event.hostUserId); return event; }
  private async serialize(projectId: string, eventId: string): Promise<QuizEventView> { const event = await this.repository.findByIdAndProjectId(eventId, projectId); if (!event) throw new Error("Quiz event was not found"); return this.readModels.create(eventId, event); }
  private snapshot(quizId: string, quiz: import("./domain/types").QuizDocument): QuizSnapshot { return { quizId, configId: quiz.configId, quizName: quiz.name, quizDescription: quiz.description, configRulesSnapshot: structuredClone(quiz.configRulesSnapshot), resources: structuredClone(quiz.resources), questions: structuredClone(quiz.questions), effectiveMessageTemplates: structuredClone(quiz.effectiveMessageTemplates), effectiveAnswerMessageTemplates: structuredClone(quiz.effectiveAnswerMessageTemplates), capturedAt: new Date().toISOString(), schemaVersion: 1 }; }
  private async project(projectId: string) { const project = await this.projectsRepository.findById(projectId); if (!project) throw new ProjectNotFoundError(projectId); return project; }
}
