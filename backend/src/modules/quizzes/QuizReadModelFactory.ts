import { buildQuizMessage } from "./domain/messageBuilder";
import type { QuizEventDocument, QuizEventView } from "./domain/types";
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
        const ranks = new Map(this.engine.rankedAnswers(question).map((answer, offset) => [answer.id, offset + 1]));
        return {
          ...structuredClone(question),
          questionTitle: source.title,
          questionText: source.text,
          generatedMessage,
          generatedAnswerMessage,
          answers: question.answers.map((answer) => ({ ...structuredClone(answer), position: ranks.get(answer.id) ?? null, awards: question.awards.filter((award) => award.answerId === answer.id).map((award) => structuredClone(award)) })),
        };
      }),
    };
  }
}
