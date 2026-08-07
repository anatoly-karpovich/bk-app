import type { Quiz, QuizEvent } from "./types";

export type QuizLibraryStatus = "draft" | "ready" | "open" | "completed";

export function getQuizEvent(quiz: Quiz, eventsById: ReadonlyMap<string, QuizEvent>): QuizEvent | null {
  return quiz.eventId ? eventsById.get(quiz.eventId) ?? null : null;
}

export function getQuizLibraryStatus(quiz: Quiz, event: QuizEvent | null): QuizLibraryStatus {
  if (event?.status === "completed") return "completed";
  if (event?.status === "open") return "open";
  return quiz.status;
}

export function formatQuizDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}
