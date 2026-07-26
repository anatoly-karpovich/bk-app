import { AppError } from "../../../common/errors";

export class ProjectCodeConflictError extends AppError {
  constructor(code: string) {
    super(`Project code "${code}" is already in use`, {
      code: "project_code_conflict",
      statusCode: 409,
    });
  }
}
