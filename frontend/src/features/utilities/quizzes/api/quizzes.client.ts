import { apiClient } from "../../../../lib/apiClient";
import type { CreateQuizInput, Quiz, QuizAnswerStatus, QuizChatPreviewCandidate, QuizEvent, QuizMessageKind } from "../types";

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
  setAnswerStatus: (projectId: string, eventId: string, questionId: string, answerId: string, status: string) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/answers/status`, { answerId, status }),
  setBulkAnswerStatus: (projectId: string, eventId: string, questionId: string, answerIds: string[], status: QuizAnswerStatus) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/answers/bulk-status`, { answerIds, status }),
  previewFragment: (projectId: string, eventId: string, questionId: string, rawText: string) => apiClient.post<QuizChatPreviewCandidate[]>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/chat-fragments/preview`, { rawText }),
  addFragment: (projectId: string, eventId: string, questionId: string, mode: "append" | "replace", rawText: string, acceptedCanonicalKeys: string[] = []) => apiClient.post<QuizEvent>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/chat-fragments`, { mode, rawText, acceptedCanonicalKeys }),
};
