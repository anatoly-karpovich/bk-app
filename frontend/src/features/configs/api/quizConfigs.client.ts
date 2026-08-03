import { apiClient } from "../../../lib/apiClient";
import type { QuizConfig } from "../../utilities/quizzes/types";

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/quiz-configs`;

export const quizConfigsApi = {
  list: (projectId: string) => apiClient.get<QuizConfig[]>(base(projectId)),
  get: (projectId: string, id: string) => apiClient.get<QuizConfig>(`${base(projectId)}/${id}`),
  create: (projectId: string, payload: object) => apiClient.post<QuizConfig>(base(projectId), payload),
  update: (projectId: string, id: string, payload: object) => apiClient.put<QuizConfig>(`${base(projectId)}/${id}`, payload),
  clone: (projectId: string, id: string) => apiClient.post<QuizConfig>(`${base(projectId)}/${id}/clone`),
  delete: (projectId: string, id: string) => apiClient.delete<void>(`${base(projectId)}/${id}`),
};
