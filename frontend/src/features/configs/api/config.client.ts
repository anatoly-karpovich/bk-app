import type { AppConfig, AppConfigMutationPayload } from "../types";
import { apiClient } from "../../../lib/apiClient";

const CONFIGS_API_BASE_URL = "/api/configs";

export async function getConfigsRequest(): Promise<AppConfig[]> {
  return await apiClient.get<AppConfig[]>(`${CONFIGS_API_BASE_URL}`);
}

export async function getConfigByIdRequest(configId: string): Promise<AppConfig> {
  return await apiClient.get<AppConfig>(`${CONFIGS_API_BASE_URL}/${encodeURIComponent(configId)}`);
}

export async function createConfigRequest(payload: AppConfigMutationPayload): Promise<AppConfig> {
  return await apiClient.post<AppConfig>(`${CONFIGS_API_BASE_URL}`, payload);
}

export async function updateConfigRequest(configId: string, payload: AppConfigMutationPayload): Promise<AppConfig> {
  return await apiClient.put<AppConfig>(`${CONFIGS_API_BASE_URL}/${encodeURIComponent(configId)}`, payload);
}

export async function deleteConfigRequest(configId: string): Promise<void> {
  await apiClient.delete<undefined>(`${CONFIGS_API_BASE_URL}/${encodeURIComponent(configId)}`);
}
