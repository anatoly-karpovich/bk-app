import type { AppConfig } from "../types";
import { apiClient } from "../../../lib/apiClient";

const CONFIGS_API_BASE_URL = "/api/configs";

export async function getConfigsRequest(): Promise<AppConfig[]> {
  return await apiClient.get<AppConfig[]>(`${CONFIGS_API_BASE_URL}`);
}

export async function getConfigByIdRequest(configId: string): Promise<AppConfig> {
  return await apiClient.get<AppConfig>(`${CONFIGS_API_BASE_URL}/${encodeURIComponent(configId)}`);
}
