import { AppError } from "./AppError";

export class NotFoundError extends AppError {
  constructor(message: string, options: { cause?: unknown; code?: string; details?: unknown } = {}) {
    super(message, {
      ...options,
      code: options.code ?? "not_found",
      statusCode: 404,
    });
  }
}
