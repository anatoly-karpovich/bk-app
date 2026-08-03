import { AppError } from "../../common/errors";

export class QuizConfigNotFoundError extends AppError {
  constructor(id: string) { super(`Quiz config ${id} was not found`, { code: "quiz_config_not_found", statusCode: 404 }); }
}

export class QuizNotFoundError extends AppError {
  constructor(id: string) { super(`Quiz ${id} was not found`, { code: "quiz_not_found", statusCode: 404 }); }
}

export class QuizValidationError extends AppError {
  constructor(message: string, details?: unknown) { super(message, { code: "quiz_validation_error", statusCode: 400, details }); }
}

export class QuizConflictError extends AppError {
  constructor(message: string) { super(message, { code: "quiz_conflict", statusCode: 409 }); }
}
