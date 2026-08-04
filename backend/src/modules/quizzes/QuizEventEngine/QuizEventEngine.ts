import { randomUUID } from "node:crypto";
import type {
  QuizChatMessageCandidate,
  QuizEventDocument,
  QuizEventQuestion,
  QuizMessageKind,
  QuizQuestion,
  QuizSelectedAnswer,
  QuizSnapshot,
} from "../domain/types";
import {
  QuizChatMessageNotFoundError,
  QuizConflictError,
  QuizPlayerAnswerSelectionError,
  QuizQuestionNotFoundError,
} from "../errors";
import { QuizAnswerRanker, type RankedQuizAnswer } from "../QuizAnswerRanker/QuizAnswerRanker";
import { QuizAwardCalculator } from "../QuizAwardCalculator/QuizAwardCalculator";
import { QuizEventSummaryCalculator } from "../QuizEventSummaryCalculator/QuizEventSummaryCalculator";
import { QuizSelectedAnswerPruner } from "../QuizSelectedAnswerPruner/QuizSelectedAnswerPruner";

export interface QuizChatMutationInput {
  rawText: string;
  messages: QuizChatMessageCandidate[];
  actorId: string;
}

export class QuizEventEngine {
  constructor(
    private readonly answerRanker: QuizAnswerRanker,
    private readonly awardCalculator: QuizAwardCalculator,
    private readonly summaryCalculator: QuizEventSummaryCalculator,
    private readonly selectedAnswerPruner: QuizSelectedAnswerPruner,
  ) {}

  create(snapshot: QuizSnapshot, host: QuizEventDocument["hostSnapshot"], name: string): QuizEventDocument {
    const now = new Date().toISOString();
    return {
      projectId: "",
      quizId: snapshot.quizId,
      quizSnapshot: structuredClone(snapshot),
      name,
      hostUserId: host.userId,
      hostSnapshot: structuredClone(host),
      status: "open",
      revision: 0,
      questions: snapshot.questions.map((question) => this.createQuestion(question, now)),
      summary: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 3,
    };
  }

  completeEvent(event: QuizEventDocument): QuizEventDocument {
    this.assertOpen(event);
    const conducted = event.questions.filter((question) => question.conductedOrder !== null);
    if (!conducted.length) throw new QuizConflictError("Нельзя завершить проведение без проведённых вопросов");
    if (conducted.some((question) => question.reviewedAt === null)) {
      throw new QuizConflictError("Нельзя завершить проведение: проведённые вопросы требуют сохранения результата");
    }
    const now = new Date().toISOString();
    const next = { ...event, status: "completed" as const, completedAt: now, updatedAt: now };
    return { ...next, summary: this.summaryCalculator.calculate(next.questions, now) };
  }

  reopenEvent(event: QuizEventDocument): QuizEventDocument {
    if (event.status !== "completed") throw new QuizConflictError("Переоткрыть можно только завершённое проведение");
    return { ...event, status: "open", completedAt: null, updatedAt: new Date().toISOString() };
  }

  saveQuestionResult(
    event: QuizEventDocument,
    questionId: string,
    selections: QuizSelectedAnswer[],
    actorId: string,
  ): QuizEventDocument {
    this.assertOpen(event);
    const current = this.getQuestion(event, questionId);
    if (current.conductedOrder === null) {
      throw new QuizConflictError("Сначала сохраните непустой чат вопроса");
    }
    this.assertSelections(current, selections);
    const now = new Date().toISOString();
    const reviewed = {
      ...current,
      selectedAnswers: structuredClone(selections),
      reviewedAt: now,
      reviewedByUserId: actorId,
      updatedAt: now,
    };
    const ranking = this.answerRanker.rank(reviewed.chat.messages, reviewed.selectedAnswers);
    reviewed.awards = this.awardCalculator.calculate(event.quizSnapshot, reviewed, ranking, now);
    return this.rebuildSummary({
      ...event,
      questions: event.questions.map((question) => question.id === questionId ? reviewed : question),
      updatedAt: now,
    }, now);
  }

  markAsNotConducted(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertOpen(event);
    const question = this.getQuestion(event, questionId);
    if (question.conductedOrder === null) return event;

    const now = new Date().toISOString();
    const removedOrder = question.conductedOrder;
    const questions = event.questions.map((item) => {
      if (item.id === questionId) {
        return {
          ...item,
          conductedOrder: null,
          reviewedAt: null,
          reviewedByUserId: null,
          awards: [],
          updatedAt: now,
        };
      }
      if (item.conductedOrder === null || item.conductedOrder < removedOrder) return item;

      const reordered = { ...item, conductedOrder: item.conductedOrder - 1, updatedAt: now };
      if (reordered.reviewedAt !== null) {
        const ranking = this.answerRanker.rank(reordered.chat.messages, reordered.selectedAnswers);
        reordered.awards = this.awardCalculator.calculate(event.quizSnapshot, reordered, ranking, now);
      }
      return reordered;
    });

    return this.rebuildSummary({ ...event, questions, updatedAt: now }, now);
  }

  setMessage(
    event: QuizEventDocument,
    questionId: string,
    kind: QuizMessageKind,
    text: string | null,
    actorId: string,
  ): QuizEventDocument {
    this.assertOpen(event);
    this.getQuestion(event, questionId);
    const now = new Date().toISOString();
    return {
      ...event,
      questions: event.questions.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              message:
                kind === "question"
                  ? {
                      ...question.message,
                      messageTextOverride: text,
                      messageTextUpdatedAt: text === null ? null : now,
                      messageTextUpdatedByUserId: text === null ? null : actorId,
                    }
                  : {
                      ...question.message,
                      answerTextOverride: text,
                      answerTextUpdatedAt: text === null ? null : now,
                      answerTextUpdatedByUserId: text === null ? null : actorId,
                    },
              updatedAt: now,
            },
      ),
      updatedAt: now,
    };
  }

  saveQuestionChat(
    event: QuizEventDocument,
    questionId: string,
    input: QuizChatMutationInput,
  ): QuizEventDocument {
    this.assertOpen(event);
    const current = this.getQuestion(event, questionId);
    const now = new Date().toISOString();
    const existingByCanonicalKey = new Map(current.chat.messages.map((message) => [message.canonicalKey, message]));
    const nextMessages = input.messages.map((message, index) => ({
      ...message,
      id: existingByCanonicalKey.get(message.canonicalKey)?.id ?? randomUUID(),
      effectiveOrder: index + 1,
    }));
    const effectiveChange = !this.sameEffectiveChat(current.chat.messages, nextMessages);
    const pruned = this.selectedAnswerPruner.prune(current.selectedAnswers, nextMessages);
    const selectionsChanged = pruned.removedCount > 0;
    const resultChanged = effectiveChange || selectionsChanged;
    const nextQuestion = {
      ...(resultChanged ? this.clearReviewedResult(current, now) : current),
      ...(selectionsChanged ? { selectedAnswers: pruned.selections } : {}),
      chat: { rawText: input.rawText, messages: nextMessages, updatedAt: now, updatedByUserId: input.actorId },
      conductedOrder: current.conductedOrder ?? (nextMessages.length ? this.nextConductedOrder(event) : null),
      updatedAt: now,
    };
    const next = {
      ...event,
      questions: event.questions.map((question) => question.id === questionId ? nextQuestion : question),
      updatedAt: now,
    };
    return resultChanged && this.hasReviewedResult(current) ? this.rebuildSummary(next, now) : next;
  }

  rankedAnswers(question: QuizEventQuestion): RankedQuizAnswer[] {
    return this.answerRanker.rank(question.chat.messages, question.selectedAnswers);
  }

  getQuestion(event: QuizEventDocument, id: string): QuizEventQuestion {
    const question = event.questions.find((candidate) => candidate.id === id);
    if (!question) throw new QuizQuestionNotFoundError(id);
    return question;
  }

  private createQuestion(question: QuizQuestion, now: string): QuizEventQuestion {
    return {
      id: randomUUID(),
      quizQuestionId: question.id,
      questionIndex: question.questionIndex,
      conductedOrder: null,
      reviewedAt: null,
      reviewedByUserId: null,
      message: {
        messageTextOverride: null,
        messageTextUpdatedAt: null,
        messageTextUpdatedByUserId: null,
        answerTextOverride: null,
        answerTextUpdatedAt: null,
        answerTextUpdatedByUserId: null,
      },
      chat: { rawText: "", messages: [], updatedAt: null, updatedByUserId: null },
      selectedAnswers: [],
      awards: [],
      updatedAt: now,
    };
  }

  private nextConductedOrder(event: QuizEventDocument): number {
    return Math.max(0, ...event.questions.map((question) => question.conductedOrder ?? 0)) + 1;
  }

  private hasReviewedResult(question: QuizEventQuestion): boolean {
    return question.reviewedAt !== null || question.reviewedByUserId !== null || question.awards.length > 0;
  }

  private clearReviewedResult(question: QuizEventQuestion, now: string): QuizEventQuestion {
    return {
      ...question,
      reviewedAt: null,
      reviewedByUserId: null,
      awards: [],
      updatedAt: now,
    };
  }

  private rebuildSummary(event: QuizEventDocument, generatedAt: string): QuizEventDocument {
    return { ...event, summary: this.summaryCalculator.calculate(event.questions, generatedAt) };
  }

  private sameEffectiveChat(
    current: QuizEventQuestion["chat"]["messages"],
    replacement: QuizEventQuestion["chat"]["messages"],
  ): boolean {
    return current.length === replacement.length && current.every(
      (message, index) => message.canonicalKey === replacement[index]?.canonicalKey,
    );
  }

  private assertSelections(question: QuizEventQuestion, selections: QuizSelectedAnswer[]): void {
    const players = new Set<string>();
    const messages = new Set<string>();
    for (const selection of selections) {
      if (players.has(selection.playerName)) throw new QuizPlayerAnswerSelectionError("duplicate_player_selection");
      players.add(selection.playerName);
      if (messages.has(selection.selectedMessageId)) throw new QuizPlayerAnswerSelectionError("duplicate_message_selection");
      messages.add(selection.selectedMessageId);
      const message = question.chat.messages.find((candidate) => candidate.id === selection.selectedMessageId);
      if (!message) throw new QuizChatMessageNotFoundError(selection.selectedMessageId);
      if (message.from !== selection.playerName) throw new QuizPlayerAnswerSelectionError("selected_message_wrong_player");
    }
  }

  private assertOpen(event: QuizEventDocument): void {
    if (event.status !== "open") throw new QuizConflictError("Завершённое проведение нельзя изменять");
  }
}
