import type { CreateQuizInput, Quiz, QuizConfig, QuizMessageTemplate, QuizQuestionDraft } from "./types";

export interface QuizDraft {
  configId: string;
  configName: string;
  name: string;
  description: string;
  questions: QuizQuestionDraft[];
  questionTemplate: QuizMessageTemplate;
  answerTemplate: QuizMessageTemplate;
}

export function createQuizDraft(config: QuizConfig): QuizDraft {
  const questionCount = config.questionCount ?? 0;

  return {
    configId: config.id,
    configName: config.name,
    name: "",
    description: "",
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: crypto.randomUUID(),
      questionIndex: index + 1,
      text: "",
      correctAnswer: null,
      notes: null,
    })),
    questionTemplate: { ...structuredClone(config.messageTemplates!.defaultTemplate) },
    answerTemplate: { ...structuredClone(config.answerMessageTemplates!.defaultTemplate) },
  };
}

export function createDraftFromQuiz(quiz: Quiz): QuizDraft {
  return {
    configId: quiz.configId,
    configName: quiz.configRulesSnapshot.configName,
    name: quiz.name,
    description: quiz.description,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      questionIndex: question.questionIndex,
      text: question.text,
      correctAnswer: question.correctAnswer,
      notes: question.notes,
    })),
    questionTemplate: { ...structuredClone(quiz.effectiveMessageTemplates.defaultTemplate) },
    answerTemplate: { ...structuredClone(quiz.effectiveAnswerMessageTemplates.defaultTemplate) },
  };
}

export function toCreateQuizInput(draft: QuizDraft): CreateQuizInput {
  return {
    configId: draft.configId,
    name: draft.name,
    description: draft.description,
    questions: draft.questions.map((question) => ({ ...question })),
  };
}

export function applyDraftToQuiz(quiz: Quiz, draft: QuizDraft): Quiz {
  return {
    ...quiz,
    name: draft.name,
    description: draft.description,
    questions: draft.questions.map((draftQuestion) => {
      const question = quiz.questions.find((candidate) => candidate.id === draftQuestion.id);
      if (!question) return { id: draftQuestion.id, questionIndex: draftQuestion.questionIndex, title: null, text: draftQuestion.text, correctAnswer: draftQuestion.correctAnswer, attachmentUrl: null, notes: draftQuestion.notes };
      return { ...question, questionIndex: draftQuestion.questionIndex, text: draftQuestion.text, correctAnswer: draftQuestion.correctAnswer, notes: draftQuestion.notes, title: null, attachmentUrl: null };
    }),
    effectiveMessageTemplates: { ...structuredClone(quiz.effectiveMessageTemplates), questionOverrides: [] },
    effectiveAnswerMessageTemplates: { ...structuredClone(quiz.effectiveAnswerMessageTemplates), questionOverrides: [] },
  };
}

export function isQuestionComplete(question: Pick<QuizQuestionDraft, "text" | "correctAnswer">): boolean {
  return Boolean(question.text.trim() && question.correctAnswer?.trim());
}

export function reorderQuestions(questions: readonly QuizQuestionDraft[], sourceId: string, targetId: string): QuizQuestionDraft[] {
  const sourceIndex = questions.findIndex((question) => question.id === sourceId);
  const targetIndex = questions.findIndex((question) => question.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...questions];

  const reordered = [...questions];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered.map((question, index) => ({ ...question, questionIndex: index + 1 }));
}

export function renderQuizTemplate(
  template: QuizMessageTemplate,
  draft: Pick<QuizDraft, "name">,
  question: QuizQuestionDraft,
  hostName: string,
): string {
  const values: Record<string, string> = {
    questionNumber: String(question.questionIndex),
    questionTitle: "",
    questionText: question.text,
    attachment: "",
    correctAnswer: question.correctAnswer ?? "",
    quizName: draft.name,
    hostName,
    emojiStart: template.variables.emojiStart ?? "",
    emojiEnd: template.variables.emojiEnd ?? "",
  };

  return template.template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);
}
