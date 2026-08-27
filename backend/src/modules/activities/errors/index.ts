import { AppError } from "../../../common/errors";

export class ActivityResultNotFoundError extends AppError {
  constructor(projectId: string, activityId: string) {
    super("Activity Result was not found", {
      statusCode: 404,
      code: "activity_result_not_found",
      details: { projectId, activityId },
    });
  }
}

export class ActivityResultRevisionConflictError extends AppError {
  constructor() {
    super("Activity Result was changed by another operation", {
      statusCode: 409,
      code: "activity_result_revision_conflict",
    });
  }
}

export class ActivityResultCompletionError extends AppError {
  constructor() {
    super("Activity Result requires at least one awarded participant before completion", {
      statusCode: 409,
      code: "activity_result_requires_awarded_participant",
    });
  }
}

export class ActivityResultTypeDisabledError extends AppError {
  constructor(type: string) {
    super("This activity type is disabled for new manual results", {
      statusCode: 409,
      code: "activity_result_type_disabled",
      details: { type },
    });
  }
}

export class ActivityResultAlreadyCompletedError extends AppError {
  constructor() {
    super("Activity Result is already completed", {
      statusCode: 409,
      code: "activity_result_already_completed",
    });
  }
}

export class ActivityResultValidationError extends AppError {
  constructor(reason: string) {
    super(reason, {
      statusCode: 400,
      code: "activity_result_invalid_input",
    });
  }
}
