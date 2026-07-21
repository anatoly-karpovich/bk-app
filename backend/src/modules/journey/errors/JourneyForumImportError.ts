import { AppError } from "../../../common/errors";

export class JourneyForumImportError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, {
      code,
      details,
      statusCode: 422,
    });
  }
}
