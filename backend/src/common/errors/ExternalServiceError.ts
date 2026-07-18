import { AppError } from "./AppError";

export class ExternalServiceError extends AppError {
  constructor(message: string, options: { cause?: unknown; code?: string; details?: unknown } = {}) {
    super(message, {
      ...options,
      code: options.code ?? "external_service_error",
      statusCode: 502,
    });
  }
}
