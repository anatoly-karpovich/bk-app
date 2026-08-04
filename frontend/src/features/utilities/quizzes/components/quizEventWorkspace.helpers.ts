import type { QuizEventQuestion } from "../types";

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
