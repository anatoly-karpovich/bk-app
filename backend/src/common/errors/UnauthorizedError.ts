import { AppError } from "./AppError";

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", options: { code?: string; details?: unknown } = {}) {
    super(message, {
      ...options,
      code: options.code ?? "AUTH_REQUIRED",
      statusCode: 401,
    });
  }
}
