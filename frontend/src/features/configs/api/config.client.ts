import type { AppConfig } from "../types";

const CONFIGS_API_BASE_URL = "/api/configs";

interface ConfigApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ConfigApiErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

type ConfigApiResponse<T> = ConfigApiSuccessResponse<T> | ConfigApiErrorResponse;

async function requestConfigsApi<T>(path: string): Promise<T> {
  const response = await fetch(`${CONFIGS_API_BASE_URL}${path}`);
  const responseBody = (await response.json().catch(() => null)) as ConfigApiResponse<T> | null;

  if (!response.ok || !responseBody?.success) {
    const message =
      responseBody && responseBody.success === false
        ? responseBody.error || responseBody.message || "Config request failed"
        : `Config request failed with status ${response.status}`;

    throw new Error(message);
  }

  return responseBody.data;
}

export function getConfigsRequest() {
  return requestConfigsApi<AppConfig[]>("");
}

export function getConfigByIdRequest(configId: string) {
  return requestConfigsApi<AppConfig>(`/${encodeURIComponent(configId)}`);
}
