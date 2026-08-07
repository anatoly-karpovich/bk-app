import type { QuizEventQuestion } from "../types";

/** Finds the next host action from already-computed event workflow state. */
export function getNextQuizQuestionToReview(questions: QuizEventQuestion[]): QuizEventQuestion | null {
  return [...questions]
    .filter((question) => question.conductedOrder !== null && question.reviewedAt === null)
    .sort((left, right) => left.conductedOrder! - right.conductedOrder!)[0] ?? null;
}

export function getQuizQuestionStateLabel(question: QuizEventQuestion): string {
  if (question.reviewedAt !== null) return `Проверен · проведён #${question.conductedOrder}`;
  if (question.conductedOrder !== null) return `Проведён #${question.conductedOrder} · требует проверки`;
  return "Ещё не проведён";
}

export function getQuizQuestionStateTone(question: QuizEventQuestion): "success" | "warning" | "default" {
  if (question.reviewedAt !== null) return "success";
  if (question.conductedOrder !== null) return "warning";
  return "default";
}

export function getShortQuizQuestionText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 44) || "Без текста";
}
