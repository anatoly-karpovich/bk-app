interface ApiResponseEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
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

  async delete<T>(path: string, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { body, headers, ...init } = options;
    const response = await fetch(path, {
      method,
      ...init,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let responseBody: ApiResponseEnvelope<T> | null = null;

    try {
      responseBody = (await response.json()) as ApiResponseEnvelope<T>;
    } catch {
      responseBody = null;
    }

    if (!response.ok || !responseBody || responseBody.success !== true) {
      throw new Error(this.getErrorMessage(response.status, responseBody));
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
