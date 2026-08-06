import type { CurrentUser } from "../../auth/types";
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

export function getQuizAuthorLabel(quiz: Quiz, event: QuizEvent | null, user: CurrentUser | null, projectId: string): string {
  if (event?.hostUserId === quiz.createdByUserId) return event.hostSnapshot.nickname;
  if (user?.id === quiz.createdByUserId) {
    return user.projectProfiles.find((profile) => profile.projectId === projectId)?.nickname ?? user.displayName;
  }
  return quiz.createdByUserId;
}

export function formatQuizDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}
