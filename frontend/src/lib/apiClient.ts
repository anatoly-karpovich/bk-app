interface ApiResponseEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | undefined, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  body?: unknown;
}

class ApiClient {
  async get<T>(path: string, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("POST", path, {
      ...options,
      body,
    });
  }

  async put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("PUT", path, {
      ...options,
      body,
    });
  }

  async patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  async delete<T>(path: string, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { body, headers, ...init } = options;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`, {
      method,
      credentials: "include",
      ...init,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(!["GET", "HEAD"].includes(method) ? { "X-BK-Client": "web" } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    let responseBody: ApiResponseEnvelope<T> | null = null;

    try {
      responseBody = (await response.json()) as ApiResponseEnvelope<T>;
    } catch {
      responseBody = null;
    }

    if (!response.ok || !responseBody || responseBody.success !== true) {
      const error = new ApiError(response.status, responseBody?.code, this.getErrorMessage(response.status, responseBody));
      if (response.status === 401 && path !== "/api/auth/me") window.dispatchEvent(new CustomEvent("bk:auth-required"));
      throw error;
    }

    return responseBody.data as T;
  }

  private getErrorMessage(status: number, responseBody: ApiResponseEnvelope<unknown> | null): string {
    if (responseBody) {
      return responseBody.error || responseBody.message || `Request failed with status ${status}`;
    }

    return `Request failed with status ${status}`;
  }
}

export const apiClient = new ApiClient();
