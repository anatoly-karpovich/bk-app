import { apiClient } from "../../../../lib/apiClient";
import type { AddQuizChatFragmentResponse, CreateQuizInput, Quiz, QuizEvent, QuizMessageKind, QuizPlayerAnswerStatus } from "../types";

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
  eventAction: (projectId: string, eventId: string, action: string) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/${action}`, {}),
  deleteEvent: (projectId: string, id: string) => apiClient.delete<void>(`${base(projectId)}/quiz-events/${id}`),
  reorderQuestions: (projectId: string, eventId: string, questionIds: string[]) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/reorder`, { questionIds }),
  questionAction: (projectId: string, eventId: string, questionId: string, action: string, body: object = {}) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/${action}`, body),
  setMessage: (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind, text: string | null) => apiClient.put<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message`, { messageKind, text }),
  clearMessage: (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind) => apiClient.deleteWithBody<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message-override`, { messageKind }),
  addFragment: (projectId: string, eventId: string, questionId: string, rawText: string) => apiClient.post<AddQuizChatFragmentResponse>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/chat-fragments`, { rawText }),
  setPlayerAnswer: (projectId: string, eventId: string, questionId: string, input: { playerName: string; status: QuizPlayerAnswerStatus; selectedMessageId: string | null }) => apiClient.put<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/player-answer`, input),
};
