import type { CurrentUser } from "../../auth/domain/types";
import type { ClientSession } from "mongodb";
import type { MongoDatabase } from "../../../infrastructure/mongo/MongoDatabase";
import { assertOwnedByUser, assertProjectAccess, getHostSnapshot } from "../../auth/authorization";
import { ChatParser } from "../../chat/ChatParser";
import { ChatTransport } from "../../chat/domain/types";
import { ProjectNotFoundError } from "../../projects/errors";
import { ProjectsRepository } from "../../projects/ProjectsRepository";
import { PlayersService } from "../../players/PlayersService";
import { QuizMessageCandidateFilter } from "../QuizMessageCandidateFilter/QuizMessageCandidateFilter";
import {
  QuizConflictError,
  QuizEventNotFoundError,
  QuizEventRevisionConflictError,
  QuizNotFoundError,
  QuizQuestionResultOrderError,
  QuizQuestionResultsLockedError,
  QuizValidationError,
} from "../errors";
import { QuizEventEngine, type ResolvedQuizSelectedAnswer } from "../QuizEventEngine/QuizEventEngine";
import { QuizEventsRepository } from "../QuizEventsRepository";
import { QuizEventReadModelFactory } from "../QuizEventReadModelFactory";
import { QuizzesRepository } from "../QuizzesRepository";
import { validateQuiz } from "../domain/validation";
import type { QuizEventDocument, QuizMessageKind, QuizSelectedAnswer, QuizSnapshot } from "../domain/types";
import type { QuizEventView } from "../domain/readModels";
import type { AnalyticsProjectionInvalidator } from "../../analytics/AnalyticsProjectionInvalidator";

export interface SaveQuizQuestionChatResult {
  event: QuizEventView;
  mutation: {
    parsedMessagesCount: number;
    candidateMessagesCount: number;
    previousMessagesCount: number;
    nextMessagesCount: number;
    removedPersistedSelectionsCount: number;
    effectiveChange: boolean;
  };
}
export interface SaveQuizQuestionResult {
  event: QuizEventView;
  result: {
    conductedOrder: number;
    awardsCount: number;
    reviewedAt: string;
  };
}
export interface QuizSelectedAnswerInput {
  playerName: string;
  playerRefId?: string | null;
  selectedMessageId: string;
}

export class QuizEventsService {
  constructor(
    private readonly repository: QuizEventsRepository,
    private readonly quizzesRepository: QuizzesRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly playersService: PlayersService,
    private readonly engine: QuizEventEngine,
    private readonly chatParser: ChatParser,
    private readonly candidateFilter: QuizMessageCandidateFilter,
    private readonly readModels: QuizEventReadModelFactory,
    private readonly mongoDatabase: MongoDatabase,
    private readonly analyticsInvalidator: AnalyticsProjectionInvalidator,
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
    if (quiz.eventId) throw new QuizConflictError("Для этой викторины уже создано проведение");
    if (validateQuiz(quiz).length) throw new Error("Из неготовой викторины нельзя создать проведение");
    const createdEvent = this.engine.create(
      this.snapshot(quizId, quiz),
      getHostSnapshot(actor, projectId),
      input.name?.trim() || quiz.name,
    );
    createdEvent.projectId = projectId;
    const created = await this.repository.create(createdEvent);
    if (!created) throw new Error("Failed to load created quiz event");
    const eventId = created._id.toHexString();
    if (!(await this.quizzesRepository.attachEvent(quizId, projectId, eventId))) {
      await this.repository.delete(eventId, projectId, created.revision);
      throw new QuizConflictError("Для этой викторины уже создано проведение");
    }
    return this.readModels.create(eventId, created);
  }

  async delete(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number): Promise<void> {
    const event = await this.editableEvent(actor, projectId, eventId);
    this.assertExpectedRevision(event, eventId, expectedRevision);
    if (!(await this.repository.delete(eventId, projectId, expectedRevision))) {
      throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    }
    await this.analyticsInvalidator.deleteSourceFact(projectId, { kind: "quiz_event", id: eventId });
    await this.quizzesRepository.clearEvent(event.quizId, projectId, eventId);
  }
  async complete(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) => this.engine.completeEvent(event));
  }
  async reopen(actor: CurrentUser, projectId: string, eventId: string, expectedRevision: number) {
    const updated = await this.mutate(actor, projectId, eventId, expectedRevision, (event) => this.engine.reopenEvent(event));
    await this.analyticsInvalidator.deleteSourceFact(projectId, { kind: "quiz_event", id: eventId });
    return updated;
  }
  async markAsNotConducted(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) => {
      this.assertQuestionResultCanBeChanged(event, questionId);
      return this.engine.markAsNotConducted(event, questionId);
    });
  }
  async markAsUnreviewed(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    expectedRevision: number,
  ) {
    return this.mutate(actor, projectId, eventId, expectedRevision, (event) => {
      this.assertQuestionResultCanBeChanged(event, questionId);
      return this.engine.markAsUnreviewed(event, questionId);
    });
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

  async saveQuestionChat(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    rawText: string,
    expectedRevision: number,
  ): Promise<SaveQuizQuestionChatResult> {
    const event = await this.editableEvent(actor, projectId, eventId);
    this.assertExpectedRevision(event, eventId, expectedRevision);
    const { parsed, candidates } = this.parseCandidates(event, rawText);
    if (rawText.trim() && !candidates.length) {
      throw new QuizValidationError("Не удалось распознать сообщения. Сохранённый чат не изменён.");
    }
    const previous = this.engine.getQuestion(event, questionId);
    const effectiveChange = !this.sameEffectiveChat(previous.chat.messages, candidates);
    if (effectiveChange) this.assertQuestionResultCanBeChanged(event, questionId);
    const updated = this.engine.saveQuestionChat(structuredClone(event), questionId, {
      rawText,
      messages: candidates,
      actorId: actor.id,
    });
    const saved = await this.repository.update(eventId, projectId, expectedRevision, updated);
    if (!saved) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    return {
      event: this.readModels.create(eventId, saved),
      mutation: {
        parsedMessagesCount: parsed.length,
        candidateMessagesCount: candidates.length,
        previousMessagesCount: previous.chat.messages.length,
        nextMessagesCount: candidates.length,
        removedPersistedSelectionsCount:
          previous.selectedAnswers.length - this.engine.getQuestion(saved, questionId).selectedAnswers.length,
        effectiveChange,
      },
    };
  }

  async saveQuestionResult(
    actor: CurrentUser,
    projectId: string,
    eventId: string,
    questionId: string,
    selections: QuizSelectedAnswerInput[],
    expectedRevision: number,
  ): Promise<SaveQuizQuestionResult> {
    const saved = await this.mongoDatabase.withTransaction(async (session) => {
      const event = await this.editableEvent(actor, projectId, eventId, session);
      this.assertExpectedRevision(event, eventId, expectedRevision);
      this.assertQuestionResultCanBeChanged(event, questionId);
      this.assertPreviousConductedResultsReviewed(event, questionId);
      const eventQuestion = this.engine.getQuestion(event, questionId);
      this.engine.validateSelectionInputs(
        eventQuestion,
        selections.map(({ playerName, selectedMessageId }) => ({ playerName, selectedMessageId })),
      );
      const resolvedSelections: ResolvedQuizSelectedAnswer[] = [];
      for (const selection of selections) {
        const resolved = await this.playersService.resolveOrCreate(
          actor,
          projectId,
          { nickname: selection.playerName, playerRefId: selection.playerRefId },
          session,
        );
        resolvedSelections.push({
          playerName: selection.playerName,
          selectedMessageId: selection.selectedMessageId,
          playerRefId: resolved.playerRefId,
        });
      }
      const updated = this.engine.saveQuestionResult(structuredClone(event), questionId, resolvedSelections, actor.id);
      return this.repository.update(eventId, projectId, expectedRevision, updated, session);
    });
    if (!saved) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    const view = this.readModels.create(eventId, saved);
    const viewQuestion = view.state.questions.find((candidate) => candidate.id === questionId);
    if (!viewQuestion || viewQuestion.workflow.conductedOrder === null || viewQuestion.workflow.reviewedAt === null)
      throw new Error("Saved quiz question result was not found");
    return {
      event: view,
      result: {
        conductedOrder: viewQuestion.workflow.conductedOrder,
        awardsCount: viewQuestion.result.awards.length,
        reviewedAt: viewQuestion.workflow.reviewedAt,
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
    const updated = await this.repository.update(
      eventId,
      projectId,
      expectedRevision,
      mutation(structuredClone(event)),
    );
    if (!updated) throw new QuizEventRevisionConflictError(eventId, expectedRevision);
    return this.readModels.create(eventId, updated);
  }

  private async editableEvent(actor: CurrentUser, projectId: string, eventId: string, session?: ClientSession) {
    assertProjectAccess(actor, projectId);
    const event = await this.repository.findByIdAndProjectId(eventId, projectId, session);
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
  private parseCandidates(event: QuizEventDocument, rawText: string) {
    const parsed = this.chatParser.parse(rawText);
    const candidates = this.candidateFilter.filter(parsed, {
      hostNickname: event.hostSnapshot.nickname,
      allowedTransports: [ChatTransport.TO, ChatTransport.PRIVATE, ChatTransport.CLAN],
    });
    return { parsed, candidates };
  }
  private sameEffectiveChat(
    left: ReadonlyArray<Pick<QuizEventDocument["questions"][number]["chat"]["messages"][number], "canonicalKey">>,
    right: ReadonlyArray<Pick<QuizEventDocument["questions"][number]["chat"]["messages"][number], "canonicalKey">>,
  ): boolean {
    return (
      left.length === right.length &&
      left.every((message, index) => message.canonicalKey === right[index]?.canonicalKey)
    );
  }
  private assertQuestionResultCanBeChanged(event: QuizEventDocument, questionId: string): void {
    if (event.quizSnapshot.configRulesSnapshot.limitOneBonusPerPlayer !== true) return;
    const question = this.engine.getQuestion(event, questionId);
    if (question.conductedOrder === null) return;
    const blockingConductedOrders = event.questions
      .filter(
        (candidate) =>
          candidate.reviewedAt !== null &&
          candidate.conductedOrder !== null &&
          candidate.conductedOrder > question.conductedOrder!,
      )
      .map((candidate) => candidate.conductedOrder!)
      .sort((left, right) => left - right);
    if (blockingConductedOrders.length) throw new QuizQuestionResultsLockedError(blockingConductedOrders);
  }
  private assertPreviousConductedResultsReviewed(event: QuizEventDocument, questionId: string): void {
    if (event.quizSnapshot.configRulesSnapshot.limitOneBonusPerPlayer !== true) return;
    const question = this.engine.getQuestion(event, questionId);
    if (question.conductedOrder === null) return;
    const requiredConductedOrders = event.questions
      .filter(
        (candidate) =>
          candidate.conductedOrder !== null &&
          candidate.conductedOrder < question.conductedOrder! &&
          candidate.reviewedAt === null,
      )
      .map((candidate) => candidate.conductedOrder!)
      .sort((left, right) => left - right);
    if (requiredConductedOrders.length) throw new QuizQuestionResultOrderError(requiredConductedOrders);
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
