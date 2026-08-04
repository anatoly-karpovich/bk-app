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

export class QuizEventRevisionConflictError extends AppError {
  constructor(eventId: string, expectedRevision: number) {
    super("Проведение уже изменилось в другой вкладке. Обновите данные и повторите действие.", {
      code: "quiz_event_revision_conflict",
      statusCode: 409,
      details: { eventId, expectedRevision },
    });
  }
}

export class QuizEventNotFoundError extends AppError {
  constructor(id: string) { super(`Quiz event ${id} was not found`, { code: "quiz_event_not_found", statusCode: 404 }); }
}

export class QuizQuestionNotFoundError extends AppError {
  constructor(id: string) { super(`Quiz event question ${id} was not found`, { code: "quiz_question_not_found", statusCode: 404 }); }
}

export class QuizChatMessageNotFoundError extends AppError {
  constructor(id: string) { super(`Quiz chat message ${id} was not found`, { code: "quiz_chat_message_not_found", statusCode: 404 }); }
}

export class QuizPlayerAnswerSelectionError extends AppError {
  constructor(reason: "selected_message_required" | "selected_message_forbidden" | "selected_message_wrong_player" | "duplicate_player_selection") { super("Недопустимый выбор сообщения игрока", { code: "quiz_player_answer_selection_error", statusCode: 400, details: { reason } }); }
}
