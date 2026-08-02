import { AppError } from "./AppError";

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options: { code?: string; details?: unknown } = {}) {
    super(message, {
      ...options,
      code: options.code ?? "FORBIDDEN",
      statusCode: 403,
    });
  }
}
