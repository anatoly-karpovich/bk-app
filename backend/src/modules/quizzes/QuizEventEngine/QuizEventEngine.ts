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
  parsedMessagesCount: number;
  candidateMessagesCount: number;
  duplicateMessagesCount: number;
  messages: QuizChatMessageCandidate[];
  insertedByUserId: string;
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
      schemaVersion: 2,
    };
  }

  completeEvent(event: QuizEventDocument): QuizEventDocument {
    this.assertOpen(event);
    const now = new Date().toISOString();
    const next = { ...event, status: "completed" as const, completedAt: now, updatedAt: now };
    return { ...next, summary: this.summaryCalculator.calculate(next.questions, now) };
  }

  reopenEvent(event: QuizEventDocument): QuizEventDocument {
    if (event.status !== "completed") throw new QuizConflictError("Переоткрыть можно только завершённое проведение");
    return { ...event, status: "open", completedAt: null, updatedAt: new Date().toISOString() };
  }

  reviewQuestion(event: QuizEventDocument, questionId: string, actorId: string): QuizEventDocument {
    this.assertOpen(event);
    const current = this.getQuestion(event, questionId);
    const now = new Date().toISOString();
    const reviewed = {
      ...current,
      conductedOrder: current.conductedOrder ?? this.nextConductedOrder(event),
      reviewedAt: now,
      reviewedByUserId: actorId,
      updatedAt: now,
    };
    const ranking = this.answerRanker.rank(reviewed.chatMessages, reviewed.selectedAnswers);
    reviewed.awards = this.awardCalculator.calculate(event.quizSnapshot, reviewed, ranking, now);
    return this.rebuildSummary({
      ...event,
      questions: event.questions.map((question) => question.id === questionId ? reviewed : question),
      updatedAt: now,
    }, now);
  }

  unreviewQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertOpen(event);
    const question = this.getQuestion(event, questionId);
    if (!this.hasReviewedResult(question)) return event;
    const now = new Date().toISOString();
    return this.rebuildSummary({
      ...event,
      questions: event.questions.map((item) =>
        item.id === questionId ? this.clearReviewedResult(item, now) : item,
      ),
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
        const ranking = this.answerRanker.rank(reordered.chatMessages, reordered.selectedAnswers);
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

  appendChat(
    event: QuizEventDocument,
    questionId: string,
    input: QuizChatMutationInput,
  ): QuizEventDocument {
    this.assertOpen(event);
    this.getQuestion(event, questionId);
    const now = new Date().toISOString();
    const fragmentId = randomUUID();
    let reviewWasCleared = false;
    const next = {
      ...event,
      questions: event.questions.map((question) => {
        if (question.id !== questionId) return question;
        const previousMessagesCount = question.chatMessages.length;
        let nextOrder = Math.max(0, ...question.chatMessages.map((message) => message.effectiveOrder));
        const effectiveChange = input.messages.length > 0;
        reviewWasCleared = effectiveChange && this.hasReviewedResult(question);
        return {
          ...(effectiveChange ? this.clearReviewedResult(question, now) : question),
          chatMessages: [
            ...question.chatMessages,
            ...input.messages.map((message) => ({
              ...message,
              id: randomUUID(),
              sourceFragmentId: fragmentId,
              effectiveOrder: ++nextOrder,
            })),
          ],
          chatFragments: [
            ...question.chatFragments,
            {
              id: fragmentId,
              mode: "append" as const,
              rawText: input.rawText,
              insertedAt: now,
              insertedByUserId: input.insertedByUserId,
              parsedMessagesCount: input.parsedMessagesCount,
              candidateMessagesCount: input.candidateMessagesCount,
              duplicateMessagesCount: input.duplicateMessagesCount,
              previousMessagesCount,
              nextMessagesCount: previousMessagesCount + input.messages.length,
              addedMessagesCount: input.messages.length,
              removedMessagesCount: 0,
              retainedMessagesCount: previousMessagesCount,
              removedPersistedSelectionsCount: 0,
              effectiveChange,
            },
          ],
          updatedAt: now,
        };
      }),
      updatedAt: now,
    };
    return reviewWasCleared ? this.rebuildSummary(next, now) : next;
  }

  replaceChat(
    event: QuizEventDocument,
    questionId: string,
    input: QuizChatMutationInput,
  ): QuizEventDocument {
    this.assertOpen(event);
    const current = this.getQuestion(event, questionId);
    if (!input.messages.length) throw new QuizConflictError("Не найдено сообщений для замены");

    const now = new Date().toISOString();
    const fragmentId = randomUUID();
    const existingByCanonicalKey = new Map(current.chatMessages.map((message) => [message.canonicalKey, message]));
    const nextMessages = input.messages.map((message, index) => ({
      ...message,
      id: existingByCanonicalKey.get(message.canonicalKey)?.id ?? randomUUID(),
      sourceFragmentId: fragmentId,
      effectiveOrder: index + 1,
    }));
    const effectiveChange = !this.sameEffectiveChat(current.chatMessages, nextMessages);
    const pruned = this.selectedAnswerPruner.prune(current.selectedAnswers, nextMessages);
    const selectionsChanged = pruned.removedCount > 0;
    const resultChanged = effectiveChange || selectionsChanged;
    const retainedMessagesCount = nextMessages.filter((message) => existingByCanonicalKey.has(message.canonicalKey)).length;
    const nextQuestion = {
      ...(resultChanged ? this.clearReviewedResult(current, now) : current),
      ...(effectiveChange ? { chatMessages: nextMessages } : {}),
      ...(selectionsChanged ? { selectedAnswers: pruned.selections } : {}),
      chatFragments: [
        ...current.chatFragments,
        {
          id: fragmentId,
          mode: "replace" as const,
          rawText: input.rawText,
          insertedAt: now,
          insertedByUserId: input.insertedByUserId,
          parsedMessagesCount: input.parsedMessagesCount,
          candidateMessagesCount: input.candidateMessagesCount,
          duplicateMessagesCount: input.duplicateMessagesCount,
          previousMessagesCount: current.chatMessages.length,
          nextMessagesCount: nextMessages.length,
          addedMessagesCount: nextMessages.length - retainedMessagesCount,
          removedMessagesCount: current.chatMessages.length - retainedMessagesCount,
          retainedMessagesCount,
          removedPersistedSelectionsCount: pruned.removedCount,
          effectiveChange: resultChanged,
        },
      ],
      updatedAt: now,
    };
    const next = {
      ...event,
      questions: event.questions.map((question) => question.id === questionId ? nextQuestion : question),
      updatedAt: now,
    };
    return resultChanged && this.hasReviewedResult(current) ? this.rebuildSummary(next, now) : next;
  }

  clearChat(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertOpen(event);
    const current = this.getQuestion(event, questionId);
    const effectiveChange = current.chatMessages.length > 0 || current.selectedAnswers.length > 0;
    if (!effectiveChange) return event;

    const now = new Date().toISOString();
    const next = {
      ...event,
      questions: event.questions.map((question) => question.id === questionId ? {
        ...this.clearReviewedResult(question, now),
        chatMessages: [],
        selectedAnswers: [],
        updatedAt: now,
      } : question),
      updatedAt: now,
    };
    return this.hasReviewedResult(current) ? this.rebuildSummary(next, now) : next;
  }

  /** Temporary compatibility adapter for the existing append endpoint. */
  appendChatFragment(
    event: QuizEventDocument,
    questionId: string,
    input: QuizChatMutationInput,
  ): QuizEventDocument {
    return this.appendChat(event, questionId, input);
  }

  setSelectedAnswers(
    event: QuizEventDocument,
    questionId: string,
    selectedAnswers: QuizSelectedAnswer[],
  ): QuizEventDocument {
    this.assertOpen(event);
    const question = this.getQuestion(event, questionId);
    this.assertSelections(question, selectedAnswers);
    if (this.sameSelections(question.selectedAnswers, selectedAnswers)) return event;
    const now = new Date().toISOString();
    const changedReviewedResult = this.hasReviewedResult(question);
    const next = {
      ...event,
      questions: event.questions.map((item) =>
        item.id === questionId
          ? {
              ...(changedReviewedResult ? this.clearReviewedResult(item, now) : item),
              selectedAnswers: structuredClone(selectedAnswers),
              updatedAt: now,
            }
          : item,
      ),
      updatedAt: now,
    };
    return changedReviewedResult ? this.rebuildSummary(next, now) : next;
  }

  /** Temporary adapter for the old per-player endpoint. Removed with the HTTP transition. */
  setPlayerAnswer(
    event: QuizEventDocument,
    questionId: string,
    input: { playerName: string; status: "pending" | "accepted" | "rejected"; selectedMessageId: string | null },
  ): QuizEventDocument {
    const question = this.getQuestion(event, questionId);
    const selections = question.selectedAnswers.filter((answer) => answer.playerName !== input.playerName);
    if (input.status === "accepted") {
      if (!input.selectedMessageId) throw new QuizPlayerAnswerSelectionError("selected_message_required");
      selections.push({ playerName: input.playerName, selectedMessageId: input.selectedMessageId });
    } else if (input.selectedMessageId) {
      throw new QuizPlayerAnswerSelectionError("selected_message_forbidden");
    }
    return this.setSelectedAnswers(event, questionId, selections);
  }

  rankedAnswers(question: QuizEventQuestion): RankedQuizAnswer[] {
    return this.answerRanker.rank(question.chatMessages, question.selectedAnswers);
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
      chatFragments: [],
      chatMessages: [],
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
    current: QuizEventQuestion["chatMessages"],
    replacement: QuizEventQuestion["chatMessages"],
  ): boolean {
    return current.length === replacement.length && current.every(
      (message, index) => message.canonicalKey === replacement[index]?.canonicalKey,
    );
  }

  private assertSelections(question: QuizEventQuestion, selections: QuizSelectedAnswer[]): void {
    const players = new Set<string>();
    for (const selection of selections) {
      if (players.has(selection.playerName)) throw new QuizPlayerAnswerSelectionError("duplicate_player_selection");
      players.add(selection.playerName);
      const message = question.chatMessages.find((candidate) => candidate.id === selection.selectedMessageId);
      if (!message) throw new QuizChatMessageNotFoundError(selection.selectedMessageId);
      if (message.from !== selection.playerName) throw new QuizPlayerAnswerSelectionError("selected_message_wrong_player");
    }
  }

  private sameSelections(left: QuizSelectedAnswer[], right: QuizSelectedAnswer[]): boolean {
    if (left.length !== right.length) return false;
    const rightByPlayer = new Map(right.map((selection) => [selection.playerName, selection.selectedMessageId]));
    return left.every((selection) => rightByPlayer.get(selection.playerName) === selection.selectedMessageId);
  }

  private assertOpen(event: QuizEventDocument): void {
    if (event.status !== "open") throw new QuizConflictError("Завершённое проведение нельзя изменять");
  }
}
