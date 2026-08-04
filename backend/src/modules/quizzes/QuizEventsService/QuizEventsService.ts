import type { CurrentUser } from "../../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../../auth/authorization";
import { ChatParser } from "../../chat/ChatParser";
import { ChatTransport } from "../../chat/domain/types";
import { ProjectNotFoundError } from "../../projects/errors";
import { ProjectsRepository } from "../../projects/ProjectsRepository";
import { ChatMessageDeduplicator } from "../ChatMessageDeduplicator/ChatMessageDeduplicator";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import { QuizEventNotFoundError, QuizEventRevisionConflictError, QuizNotFoundError } from "../errors";
import { QuizEventEngine } from "../QuizEventEngine/QuizEventEngine";
import { QuizEventsRepository } from "../QuizEventsRepository";
import { QuizReadModelFactory } from "../QuizReadModelFactory";
import { QuizzesRepository } from "../QuizzesRepository";
import { validateQuiz } from "../domain/validation";
import type {
  QuizEventDocument,
  QuizEventView,
  QuizMessageKind,
  QuizSnapshot,
} from "../domain/types";

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

  async list(actor: CurrentUser, projectId: string): Promise<QuizEventView[]> {
    assertProjectAccess(actor, projectId);
    await this.project(projectId);
    return (await this.repository.findByProjectId(projectId)).map((event) =>
      this.readModels.create(event._id.toHexString(), event),
    );
  }
  async get(actor: CurrentUser, projectId: string, eventId: string): Promise<QuizEventView> {
    assertProjectAccess(actor, projectId);
    return this.serialize(projectId, eventId);
  }

  async create(
    actor: CurrentUser,
    projectId: string,
    quizId: string,
    input: { name?: string },
  ): Promise<QuizEventView> {
    assertProjectAccess(actor, projectId);
    const quiz = await this.quizzesRepository.findByIdAndProjectId(quizId, projectId);
    if (!quiz) throw new QuizNotFoundError(quizId);
    if (validateQuiz(quiz).length) throw new Error("Из неготовой викторины нельзя создать проведение");
    const createdEvent = this.engine.create(
      this.snapshot(quizId, quiz),
      getHostSnapshot(actor, projectId),
      input.name?.trim() || quiz.name,
    );
    createdEvent.projectId = projectId;
    const created = await this.repository.create(createdEvent);
    if (!created) throw new Error("Failed to load created quiz event");
    return this.readModels.create(created._id.toHexString(), created);
  }

  async delete(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number): Promise<void> {
    const event = await this.editableEvent(actor, projectId, eventId);
    this.assertExpectedRevision(event, eventId, expectedRevision);
    if (!(await this.repository.delete(eventId, projectId, expectedRevision))) {
      throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    }
  }
  async complete(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) => this.engine.completeEvent(event));
  }
  async reopen(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) => this.engine.reopenEvent(event));
  }
  async setMessage(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    kind: QuizMessageKind,
    text: string | null,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) =>
      this.engine.setMessage(event, questionId, kind, text, actor.id),
    );
  }

  async addChatFragment(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    rawText: string,
    expectedRevision: number,
  ): Promise<AddQuizChatFragmentResult> {
    const event = await this.editableEvent(actor, projectId, eventId);
    this.assertExpectedRevision(event, eventId, expectedRevision);
    const question = this.engine.getQuestion(event, questionId);
    const parsed = this.chatParser.parse(rawText);
    const candidates = this.candidateFilter.filter(parsed, {
      hostNickname: event.hostSnapshot.nickname,
      allowedTransports: [ChatTransport.DIRECT, ChatTransport.CLAN],
    });
    const deduplicated = this.deduplicator.deduplicate(question.chatMessages, candidates);
    const updated = this.engine.appendChatFragment(structuredClone(event), questionId, {
      rawText,
      parsedMessagesCount: parsed.length,
      candidateMessagesCount: candidates.length,
      duplicateMessagesCount: deduplicated.duplicatesCount,
      messages: deduplicated.unique,
      insertedByUserId: actor.id,
    });
    const saved = await this.repository.update(eventId, projectId, expectedRevision, updated);
    if (!saved) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
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

  private async mutate(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    expectedRevision: number,
    mutation: (event: QuizEventDocument) => QuizEventDocument,
  ): Promise<QuizEventView> {
    const event = await this.editableEvent(actor, projectId, eventId);
    this.assertExpectedRevision(event, eventId, expectedRevision);
    const updated = await this.repository.update(eventId, projectId, expectedRevision, mutation(structuredClone(event)));
    if (!updated) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    return this.readModels.create(eventId, updated);
  }

  private async editableEvent(actor: CurrentUser, projectId: string, eventId: string) {
    assertProjectAccess(actor, projectId);
    const event = await this.repository.findByIdAndProjectId(eventId, projectId);
    if (!event) throw new QuizEventNotFoundError(eventId);
    assertOwnedByUser(actor, event.hostUserId);
    return event;
  }
  private async serialize(projectId: string, eventId: string): Promise<QuizEventView> {
    const event = await this.repository.findByIdAndProjectId(eventId, projectId);
    if (!event) throw new QuizEventNotFoundError(eventId);
    return this.readModels.create(eventId, event);
  }
  private assertExpectedRevision(event: QuizEventDocument, eventId: string, expectedRevision: number): void {
    if (event.revision !== expectedRevision) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
  }
  private snapshot(quizId: string, quiz: import("../domain/types").QuizDocument): QuizSnapshot {
    return {
      quizId,
      configId: quiz.configId,
      quizName: quiz.name,
      quizDescription: quiz.description,
      configRulesSnapshot: structuredClone(quiz.configRulesSnapshot),
      resources: structuredClone(quiz.resources),
      questions: structuredClone(quiz.questions),
      effectiveMessageTemplates: structuredClone(quiz.effectiveMessageTemplates),
      effectiveAnswerMessageTemplates: structuredClone(quiz.effectiveAnswerMessageTemplates),
      capturedAt: new Date().toISOString(),
      schemaVersion: 1,
    };
  }
  private async project(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new ProjectNotFoundError(projectId);
    return project;
  }
}
