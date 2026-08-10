import type { QuizMessageTemplate, QuizMessageTemplates, QuizQuestion } from "./types";

export function buildQuizMessage(input: {
  quizName: string;
  hostName: string;
  question: QuizQuestion;
  questionIndex: number;
  templates: QuizMessageTemplates;
}): string {
  const template = getTemplate(input.templates, input.questionIndex);
  const values: Record<string, string> = {
    questionNumber: String(input.questionIndex),
    questionTitle: input.question.title ?? "",
    questionText: input.question.text,
    attachment: input.question.attachmentUrl ?? "",
    correctAnswer: input.question.correctAnswer ?? "",
    quizName: input.quizName,
    hostName: input.hostName,
    emojiStart: template.variables.emojiStart ?? "",
    emojiEnd: template.variables.emojiEnd ?? "",
  };
  return template.template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

function getTemplate(templates: QuizMessageTemplates, questionIndex: number): QuizMessageTemplate {
  return (
    templates.questionOverrides.find((override) => override.questionIndex === questionIndex)?.template ??
    templates.defaultTemplate
  );
}
