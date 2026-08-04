import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../auth/authorization";
import { ChatParser } from "../chat/ChatParser";
import { ChatTransport } from "../chat/domain/types";
import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import { ChatMessageDeduplicator } from "./ChatMessageDeduplicator";
import { QuizMessageCandidateFilter } from "./QuizMessageCandidateFilter";
import { QuizNotFoundError } from "./errors";
import { QuizEventEngine } from "./QuizEventEngine";
import { QuizEventsRepository } from "./QuizEventsRepository";
import { QuizReadModelFactory } from "./QuizReadModelFactory";
import { QuizzesRepository } from "./QuizzesRepository";
import { validateQuiz } from "./domain/validation";
import type { QuizEventDocument, QuizEventView, QuizMessageKind, QuizPlayerAnswerStatus, QuizSnapshot } from "./domain/types";

export interface AddQuizChatFragmentResult {
  event: QuizEventView;
  importResult: {
    fragmentId: string;
    parsedMessagesCount: number;
    candidateMessagesCount: number;
    addedMessagesCount: number;
    duplicateMessagesCount: number;
  };
}

export class QuizEventsService {
  constructor(
    private readonly repository: QuizEventsRepository,
    private readonly quizzesRepository: QuizzesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly engine: QuizEventEngine,
    private readonly chatParser: ChatParser,
    private readonly candidateFilter: QuizMessageCandidateFilter,
    private readonly deduplicator: ChatMessageDeduplicator,
    private readonly readModels: QuizReadModelFactory,
  ) {}

  async list(actor: CurrentUser, projectId: string): Promise<QuizEventView[]> { assertProjectAccess(actor, projectId); await this.project(projectId); return (await this.repository.findByProjectId(projectId)).map((event) => this.readModels.create(event._id.toHexString(), event)); }
  async get(actor: CurrentUser, projectId: string, eventId: string): Promise<QuizEventView> { assertProjectAccess(actor, projectId); return this.serialize(projectId, eventId); }

  async create(actor: CurrentUser, projectId: string, quizId: string, input: { name?: string }): Promise<QuizEventView> {
    assertProjectAccess(actor, projectId);
    const quiz = await this.quizzesRepository.findByIdAndProjectId(quizId, projectId);
    if (!quiz) throw new QuizNotFoundError(quizId);
    if (validateQuiz(quiz).length) throw new Error("Из неготовой викторины нельзя создать проведение");
    const createdEvent = this.engine.create(this.snapshot(quizId, quiz), getHostSnapshot(actor, projectId), input.name?.trim() || quiz.name);
    const firstQuestionId = createdEvent.questions[0]?.id;
    const event = firstQuestionId ? this.engine.startQuestion(this.engine.start(createdEvent), firstQuestionId) : this.engine.start(createdEvent);
    event.projectId = projectId;
    const created = await this.repository.create(event);
    if (!created) throw new Error("Failed to load created quiz event");
    return this.readModels.create(created._id.toHexString(), created);
  }

  async delete(actor: CurrentUser, projectId: string, eventId: string): Promise<void> { await this.editableEvent(actor, projectId, eventId); if (!await this.repository.delete(eventId, projectId)) throw new Error("Quiz event was not deleted"); }
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

  async addChatFragment(actor: CurrentUser, projectId: string, eventId: string, questionId: string, rawText: string): Promise<AddQuizChatFragmentResult> {
    const event = await this.editableEvent(actor, projectId, eventId);
    const question = this.engine.getQuestion(event, questionId);
    const parsed = this.chatParser.parse(rawText);
    const candidates = this.candidateFilter.filter(parsed, { hostNickname: event.hostSnapshot.nickname, allowedTransports: [ChatTransport.DIRECT, ChatTransport.CLAN] });
    const deduplicated = this.deduplicator.deduplicate(question.chatMessages, candidates);
    const updated = this.engine.appendChatFragment(structuredClone(event), questionId, {
      rawText,
      parsedMessagesCount: parsed.length,
      candidateMessagesCount: candidates.length,
      duplicateMessagesCount: deduplicated.duplicatesCount,
      messages: deduplicated.unique,
      insertedByUserId: actor.id,
    });
    const saved = await this.repository.update(eventId, projectId, updated);
    if (!saved) throw new Error("Quiz event was not saved");
    const savedQuestion = this.engine.getQuestion(saved, questionId);
    const fragment = savedQuestion.chatFragments.at(-1)!;
    return {
      event: this.readModels.create(eventId, saved),
      importResult: {
        fragmentId: fragment.id,
        parsedMessagesCount: fragment.parsedMessagesCount,
        candidateMessagesCount: fragment.candidateMessagesCount,
        addedMessagesCount: fragment.addedMessagesCount,
        duplicateMessagesCount: fragment.duplicateMessagesCount,
      },
    };
  }

  async setPlayerAnswer(actor: CurrentUser, projectId: string, eventId: string, questionId: string, input: { playerName: string; status: QuizPlayerAnswerStatus; selectedMessageId: string | null }) {
    return this.mutate(actor, projectId, eventId, (event) => this.engine.setPlayerAnswer(event, questionId, { ...input, decidedByUserId: actor.id }));
  }

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
