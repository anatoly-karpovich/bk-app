import { apiClient } from "../../../../lib/apiClient";
import type {
  CreateQuizInput,
  Quiz,
  QuizChatMutationResult,
  QuizEvent,
  QuizMessageKind,
  SaveQuizQuestionResult,
} from "../types";
import type {
  QuizApiView,
  QuizChatMutationApiResult,
  QuizEventApiView,
  SaveQuizQuestionResultApiResult,
} from "./quiz.views";
import { quizViewMapper } from "../mappers/QuizViewMapper";

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`;
export const quizzesApi = {
  list: async (projectId: string) => (await apiClient.get<QuizApiView[]>(`${base(projectId)}/quizzes`)).map((view) => quizViewMapper.toQuiz(view)),
  get: async (projectId: string, quizId: string) => quizViewMapper.toQuiz(await apiClient.get<QuizApiView>(`${base(projectId)}/quizzes/${encodeURIComponent(quizId)}`)),
  create: async (projectId: string, input: CreateQuizInput) => quizViewMapper.toQuiz(await apiClient.post<QuizApiView>(`${base(projectId)}/quizzes`, input)),
  update: async (projectId: string, quiz: Quiz) => quizViewMapper.toQuiz(await apiClient.put<QuizApiView>(`${base(projectId)}/quizzes/${quiz.id}`, { name: quiz.name, description: quiz.description, questions: quiz.questions, effectiveMessageTemplates: quiz.effectiveMessageTemplates, effectiveAnswerMessageTemplates: quiz.effectiveAnswerMessageTemplates })),
  deleteQuiz: (projectId: string, id: string) => apiClient.delete<void>(`${base(projectId)}/quizzes/${id}`),
  listEvents: async (projectId: string) => (await apiClient.get<QuizEventApiView[]>(`${base(projectId)}/quiz-events`)).map((view) => quizViewMapper.toEvent(view)),
  getEvent: async (projectId: string, eventId: string) => quizViewMapper.toEvent(await apiClient.get<QuizEventApiView>(`${base(projectId)}/quiz-events/${encodeURIComponent(eventId)}`)),
  createEvent: async (projectId: string, quizId: string) => quizViewMapper.toEvent(await apiClient.post<QuizEventApiView>(`${base(projectId)}/quizzes/${quizId}/events`, {})),
  completeEvent: async (projectId: string, eventId: string, revision: number) => quizViewMapper.toEvent(await apiClient.post<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/complete`, { revision })),
  reopenEvent: async (projectId: string, eventId: string, revision: number) => quizViewMapper.toEvent(await apiClient.post<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/reopen`, { revision })),
  deleteEvent: (projectId: string, eventId: string, revision: number) => apiClient.deleteWithBody<void>(`${base(projectId)}/quiz-events/${eventId}`, { revision }),
  markQuestionAsNotConducted: async (projectId: string, eventId: string, questionId: string, revision: number) => quizViewMapper.toEvent(await apiClient.post<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/mark-not-conducted`, { revision })),
  markQuestionAsUnreviewed: async (projectId: string, eventId: string, questionId: string, revision: number) => quizViewMapper.toEvent(await apiClient.post<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/mark-unreviewed`, { revision })),
  saveQuestionChat: async (projectId: string, eventId: string, questionId: string, rawText: string, revision: number) => quizViewMapper.toChatMutationResult(await apiClient.put<QuizChatMutationApiResult>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/chat`, { rawText, revision })),
  saveQuestionResult: async (projectId: string, eventId: string, questionId: string, selections: Array<{ playerName: string; selectedMessageId: string }>, revision: number) => quizViewMapper.toQuestionResult(await apiClient.put<SaveQuizQuestionResultApiResult>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/result`, { selections, revision })),
  setMessage: async (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind, text: string | null, revision: number) => quizViewMapper.toEvent(await apiClient.put<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message`, { messageKind, text, revision })),
  clearMessage: async (projectId: string, eventId: string, questionId: string, messageKind: QuizMessageKind, revision: number) => quizViewMapper.toEvent(await apiClient.deleteWithBody<QuizEventApiView>(`${base(projectId)}/quiz-events/${eventId}/questions/${questionId}/message-override`, { messageKind, revision })),
};
