import { apiClient } from "../../../lib/apiClient";
import type { QuizConfig } from "../../utilities/quizzes/types";
import type { QuizConfigApiView } from "../../utilities/quizzes/api/quiz.views";
import { quizViewMapper } from "../../utilities/quizzes/mappers/QuizViewMapper";

const base = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/quiz-configs`;

export const quizConfigsApi = {
  list: async (projectId: string) => (await apiClient.get<QuizConfigApiView[]>(base(projectId))).map((view) => quizViewMapper.toConfig(view)),
  get: async (projectId: string, id: string) => quizViewMapper.toConfig(await apiClient.get<QuizConfigApiView>(`${base(projectId)}/${id}`)),
  create: async (projectId: string, payload: object) => quizViewMapper.toConfig(await apiClient.post<QuizConfigApiView>(base(projectId), payload)),
  update: async (projectId: string, id: string, config: QuizConfig) => quizViewMapper.toConfig(await apiClient.put<QuizConfigApiView>(`${base(projectId)}/${id}`, toSaveInput(config))),
  clone: async (projectId: string, id: string) => quizViewMapper.toConfig(await apiClient.post<QuizConfigApiView>(`${base(projectId)}/${id}/clone`)),
  delete: (projectId: string, id: string) => apiClient.delete<void>(`${base(projectId)}/${id}`),
};

function toSaveInput(config: QuizConfig) {
  return {
    name: config.name,
    description: config.description,
    questionCount: config.questionCount,
    defaultRegularRule: config.defaultRegularRule,
    regularRewardOverrides: config.regularRewardOverrides,
    bonusRules: config.bonusRules,
    messageTemplates: config.messageTemplates,
    answerMessageTemplates: config.answerMessageTemplates,
    isSystem: config.isSystem,
  };
}
