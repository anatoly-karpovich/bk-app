import { buildQuizMessage } from "./domain/messageBuilder";
import type { QuizEventDocument, QuizEventQuestion, QuizEventView, QuizPlayerMessageGroupView } from "./domain/types";
import { QuizAnswerRanker } from "./QuizAnswerRanker/QuizAnswerRanker";

export class QuizReadModelFactory {
  constructor(private readonly answerRanker: QuizAnswerRanker) {}

  create(id: string, event: QuizEventDocument): QuizEventView {
    const questionsById = new Map(event.quizSnapshot.questions.map((question) => [question.id, question]));
    return {
      id, ...structuredClone(event),
      conductedQuestionsCount: event.questions.filter((question) => question.conductedOrder !== null).length,
      reviewedQuestionsCount: event.questions.filter((question) => question.reviewedAt !== null).length,
      preparedQuestionsCount: event.questions.length,
      firstUnconductedQuestionId:
        event.questions.find((question) => question.conductedOrder === null)?.id ?? null,
      questions: event.questions.map((question) => {
        const normalizedQuestion = this.normalizeQuestion(question);
        const source = questionsById.get(question.quizQuestionId)!;
        const generatedMessage = buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: question.questionIndex, templates: event.quizSnapshot.effectiveMessageTemplates });
        const generatedAnswerMessage = buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: question.questionIndex, templates: event.quizSnapshot.effectiveAnswerMessageTemplates });
        return {
          ...structuredClone(normalizedQuestion),
          questionTitle: source.title,
          questionText: source.text,
          generatedMessage,
          generatedAnswerMessage,
          playerGroups: this.playerGroups(normalizedQuestion),
          ranking: this.answerRanker.rank(normalizedQuestion.chat.messages, normalizedQuestion.selectedAnswers),
        };
      }),
    };
  }

  /**
   * Quiz events created before the chat-workspace schema may lack these nested
   * fields. Reading them must remain safe; this projection does not mutate the
   * saved event and uses empty values for unavailable historical details.
   */
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
