import { AppError } from "./AppError";

export class ConflictError extends AppError {
  constructor(message: string, options: { cause?: unknown; code?: string; details?: unknown } = {}) {
    super(message, {
      ...options,
      code: options.code ?? "conflict",
      statusCode: 409,
    });
  }
}
