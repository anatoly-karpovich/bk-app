import { AppError } from "../../../common/errors/AppError";

/** Raised by the internal read layer before an invalid query reaches an API boundary. */
export class AnalyticsInvalidQueryError extends AppError {
  constructor(reason: string) {
    super(`Invalid analytics query: ${reason}`, {
      code: "analytics_invalid_query",
      details: { reason },
      statusCode: 400,
    });
  }
}
