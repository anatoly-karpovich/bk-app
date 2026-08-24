import { buildQuizMessage } from "./domain/messageBuilder";
import type { QuizAwardView, QuizEventSummaryView, QuizEventView } from "./domain/readModels";
import type { QuizAward, QuizEventDocument, QuizEventQuestion, QuizEventSummary, QuizPlayerMessageGroupView } from "./domain/types";
import { QuizAnswerRanker } from "./QuizAnswerRanker/QuizAnswerRanker";

export class QuizEventReadModelFactory {
  constructor(private readonly answerRanker: QuizAnswerRanker) {}

  create(id: string, event: QuizEventDocument): QuizEventView {
    const questionsById = new Map(event.quizSnapshot.questions.map((question) => [question.id, question]));
    const questions = event.questions.map((question) => {
      const normalizedQuestion = this.normalizeQuestion(question);
      const source = questionsById.get(question.quizQuestionId)!;
      return {
        id: normalizedQuestion.id,
        content: { questionIndex: normalizedQuestion.questionIndex, title: source.title, text: source.text },
        workflow: {
          conductedOrder: normalizedQuestion.conductedOrder,
          reviewedAt: normalizedQuestion.reviewedAt,
          reviewedByUserId: normalizedQuestion.reviewedByUserId,
        },
        messages: {
          generatedQuestion: buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: normalizedQuestion.questionIndex, templates: event.quizSnapshot.effectiveMessageTemplates }),
          generatedAnswer: buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: normalizedQuestion.questionIndex, templates: event.quizSnapshot.effectiveAnswerMessageTemplates }),
          overrides: clone(normalizedQuestion.message),
        },
        chat: {
          rawText: normalizedQuestion.chat.rawText,
          updatedAt: normalizedQuestion.chat.updatedAt,
          updatedByUserId: normalizedQuestion.chat.updatedByUserId,
          playerGroups: this.playerGroups(normalizedQuestion),
        },
        result: {
          ranking: this.rankingView(normalizedQuestion),
          awards: normalizedQuestion.awards.map((award) => this.awardView(award)),
        },
      };
    });
    return {
      id,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      meta: {
        projectId: event.projectId,
        quizId: event.quizId,
        name: event.name,
        status: event.status,
        revision: event.revision,
        completedAt: event.completedAt,
        hostUserId: event.hostUserId,
        hostSnapshot: clone(event.hostSnapshot),
      },
      configuration: {
        sourceQuiz: {
          quizId: event.quizSnapshot.quizId,
          configId: event.quizSnapshot.configId,
          quizName: event.quizSnapshot.quizName,
          quizDescription: event.quizSnapshot.quizDescription,
          capturedAt: event.quizSnapshot.capturedAt,
        },
        resources: clone(event.quizSnapshot.resources),
        configRulesSnapshot: clone(event.quizSnapshot.configRulesSnapshot),
      },
      state: {
        progress: {
          conductedQuestionsCount: questions.filter((question) => question.workflow.conductedOrder !== null).length,
          reviewedQuestionsCount: questions.filter((question) => question.workflow.reviewedAt !== null).length,
          preparedQuestionsCount: questions.length,
          firstUnconductedQuestionId: questions.find((question) => question.workflow.conductedOrder === null)?.id ?? null,
        },
        questions,
        summary: event.summary ? this.summaryView(event.summary) : null,
      },
    };
  }

  private normalizeQuestion(question: QuizEventQuestion): QuizEventQuestion {
    const legacyQuestion = question as Partial<QuizEventQuestion>;
    const chat = {
      rawText: legacyQuestion.chat?.rawText ?? "",
      messages: legacyQuestion.chat?.messages ?? [],
      updatedAt: legacyQuestion.chat?.updatedAt ?? null,
      updatedByUserId: legacyQuestion.chat?.updatedByUserId ?? null,
    };
    const messagesById = new Map(chat.messages.map((message) => [message.id, message]));
    return {
      ...question,
      message: legacyQuestion.message ?? {
        messageTextOverride: null,
        messageTextUpdatedAt: null,
        messageTextUpdatedByUserId: null,
        answerTextOverride: null,
        answerTextUpdatedAt: null,
        answerTextUpdatedByUserId: null,
      },
      chat,
      selectedAnswers: (legacyQuestion.selectedAnswers ?? []).filter((selection) =>
        messagesById.get(selection.selectedMessageId)?.from === selection.playerName,
      ),
      awards: legacyQuestion.awards ?? [],
    };
  }

  private playerGroups(question: QuizEventQuestion): QuizPlayerMessageGroupView[] {
    const selections = new Map(question.selectedAnswers.map((selection) => [selection.playerName, selection]));
    const groups = new Map<string, QuizPlayerMessageGroupView>();
    for (const message of question.chat.messages) {
      const group = groups.get(message.from) ?? {
        playerName: message.from,
        selectedMessageId: selections.get(message.from)?.selectedMessageId ?? null,
        messages: [],
      };
      group.messages.push({ id: message.id, text: message.text, timestamp: message.timestamp, effectiveOrder: message.effectiveOrder, transport: message.transport });
      groups.set(message.from, group);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, messages: [...group.messages].sort((left, right) => this.compareMessages(left, right)) }))
      .sort((left, right) => this.compareMessages(left.messages[0]!, right.messages[0]!));
  }

  private awardView(award: QuizAward): QuizAwardView {
    return {
      id: award.id,
      selectedMessageId: award.selectedMessageId,
      playerName: award.playerName,
      questionIndex: award.questionIndex,
      source: clone(award.source),
      rewards: clone(award.rewards),
      awardedAt: award.awardedAt,
    };
  }

  private rankingView(question: QuizEventQuestion) {
    return this.answerRanker.rank(question.chat.messages, question.selectedAnswers).map((answer) => ({
      playerName: answer.playerName,
      selectedMessageId: answer.selectedMessageId,
      timestamp: answer.timestamp,
      effectiveOrder: answer.effectiveOrder,
      position: answer.position,
    }));
  }

  private summaryView(summary: QuizEventSummary): QuizEventSummaryView {
    return {
      players: summary.players.map((player) => ({
        playerName: player.playerName,
        correctAnswers: player.correctAnswers,
        regularRewards: clone(player.regularRewards),
        bonusRewards: clone(player.bonusRewards),
        totalRewards: clone(player.totalRewards),
      })),
      totalPreparedQuestions: summary.totalPreparedQuestions,
      totalConductedQuestions: summary.totalConductedQuestions,
      totalReviewedQuestions: summary.totalReviewedQuestions,
      totalSelectedAnswers: summary.totalSelectedAnswers,
      totalUniquePlayers: summary.totalUniquePlayers,
      totalRewards: clone(summary.totalRewards),
      generatedAt: summary.generatedAt,
    };
  }

  private compareMessages(left: { timestamp: string | null; effectiveOrder: number }, right: { timestamp: string | null; effectiveOrder: number }): number {
    const minutes = (timestamp: string | null) => {
      if (!timestamp) return Number.MAX_SAFE_INTEGER;
      const [hour, minute] = timestamp.split(":").map(Number);
      return hour * 60 + minute;
    };
    const difference = minutes(left.timestamp) - minutes(right.timestamp);
    return difference || left.effectiveOrder - right.effectiveOrder;
  }
}

const clone = <T>(value: T): T => structuredClone(value);
