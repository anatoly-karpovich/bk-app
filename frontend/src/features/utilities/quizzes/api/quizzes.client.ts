import { apiClient } from "../../../../lib/apiClient";
import type {
  CreateQuizInput,
  Quiz,
  QuizChatMutationResult,
  QuizEvent,
  QuizMessageKind,
  SaveQuizQuestionResult,
} from "../types";

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`;
export const quizzesApi = {
  list: (projectId: string) => apiClient.get<Quiz[]>(`${base(projectId)}/quizzes`),
  get: (projectId: string, quizId: string) => apiClient.get<Quiz>(`${base(projectId)}/quizzes/${encodeURIComponent(quizId)}`),
  create: (projectId: string, input: CreateQuizInput) => apiClient.post<Quiz>(`${base(projectId)}/quizzes`, input),
  update: (projectId: string, quiz: Quiz) => apiClient.put<Quiz>(`${base(projectId)}/quizzes/${quiz.id}`, { name: quiz.name, description: quiz.description, questions: quiz.questions, effectiveMessageTemplates: quiz.effectiveMessageTemplates, effectiveAnswerMessageTemplates: quiz.effectiveAnswerMessageTemplates }),
  deleteQuiz: (projectId: string, id: string) => apiClient.delete<void>(`${base(projectId)}/quizzes/${id}`),
  listEvents: (projectId: string) => apiClient.get<QuizEvent[]>(`${base(projectId)}/quiz-events`),
  getEvent: (projectId: string, eventId: string) => apiClient.get<QuizEvent>(`${base(projectId)}/quiz-events/${encodeURIComponent(eventId)}`),
  createEvent: (projectId: string, quizId: string) => apiClient.post<QuizEvent>(`${base(projectId)}/quizzes/${quizId}/events`, {}),
  completeEvent: (projectId: string, eventId: string, revision: number) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/complete`, { revision }),
  reopenEvent: (projectId: string, eventId: string, revision: number) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/reopen`, { revision }),
  deleteEvent: (projectId: string, eventId: string, revision: number) => apiClient.deleteWithBody<void>(`${base(projectId)}/quiz-events/${eventId}`, { revision }),
  markQuestionAsNotConducted: (projectId: string, eventId: string, questionId: string, revision: number) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/mark-not-conducted`, { revision }),
  markQuestionAsUnreviewed: (projectId: string, eventId: string, questionId: string, revision: number) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/mark-unreviewed`, { revision }),
  saveQuestionChat: (projectId: string, eventId: string, questionId: string, rawText: string, revision: number) => apiClient.put<QuizChatMutationResult>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/chat`, { rawText, revision }),
  saveQuestionResult: (projectId: string, eventId: string, questionId: string, selections: Array<{ playerName: string; selectedMessageId: string }>, revision: number) => apiClient.put<SaveQuizQuestionResult>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/result`, { selections, revision }),
  setMessage: (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind, text: string | null, revision: number) => apiClient.put<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message`, { messageKind, text, revision }),
  clearMessage: (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind, revision: number) => apiClient.deleteWithBody<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message-override`, { messageKind, revision }),
};
