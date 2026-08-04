import { buildQuizMessage } from "./domain/messageBuilder";
import type { QuizEventDocument, QuizEventQuestion, QuizEventView, QuizPlayerMessageGroupView } from "./domain/types";
import { QuizEventEngine } from "./QuizEventEngine";

export class QuizReadModelFactory {
  constructor(private readonly engine: QuizEventEngine) {}

  create(id: string, event: QuizEventDocument): QuizEventView {
    const questionsById = new Map(event.quizSnapshot.questions.map((question) => [question.id, question]));
    return {
      id, ...structuredClone(event),
      questions: event.questions.map((question) => {
        const source = questionsById.get(question.quizQuestionId)!;
        const generatedMessage = buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: question.questionIndex, templates: event.quizSnapshot.effectiveMessageTemplates });
        const generatedAnswerMessage = buildQuizMessage({ quizName: event.quizSnapshot.quizName, hostName: event.hostSnapshot.nickname, question: source, questionIndex: question.questionIndex, templates: event.quizSnapshot.effectiveAnswerMessageTemplates });
        return {
          ...structuredClone(question),
          questionTitle: source.title,
          questionText: source.text,
          generatedMessage,
          generatedAnswerMessage,
          playerGroups: this.playerGroups(question),
          ranking: this.engine.rankedAnswers(question),
        };
      }),
    };
  }

  private playerGroups(question: QuizEventQuestion): QuizPlayerMessageGroupView[] {
    const decisions = new Map(question.playerAnswers.map((decision) => [decision.playerName, decision]));
    const groups = new Map<string, QuizPlayerMessageGroupView>();
    for (const message of question.chatMessages) {
      const group = groups.get(message.from) ?? {
        playerName: message.from,
        status: decisions.get(message.from)?.status ?? "pending",
        selectedMessageId: decisions.get(message.from)?.selectedMessageId ?? null,
        messages: [],
      };
      group.messages.push({ id: message.id, text: message.text, timestamp: message.timestamp, firstSeenOrder: message.firstSeenOrder, transport: message.transport });
      groups.set(message.from, group);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, messages: [...group.messages].sort((left, right) => this.compareMessages(left, right, question)) }))
      .sort((left, right) => this.compareMessages(left.messages[0]!, right.messages[0]!, question));
  }

  private compareMessages(left: { timestamp: string | null; firstSeenOrder: number }, right: { timestamp: string | null; firstSeenOrder: number }, question: QuizEventQuestion): number {
    const start = question.startedAt ? new Date(question.startedAt) : null;
    const relativeMinutes = (timestamp: string | null) => {
      if (!timestamp) return Number.MAX_SAFE_INTEGER;
      const [hour, minute] = timestamp.split(":").map(Number);
      const value = hour * 60 + minute;
      if (!start) return value;
      return (value - (start.getHours() * 60 + start.getMinutes()) + 24 * 60) % (24 * 60);
    };
    const difference = relativeMinutes(left.timestamp) - relativeMinutes(right.timestamp);
    return difference || left.firstSeenOrder - right.firstSeenOrder;
  }
}
