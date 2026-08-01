import { AppError } from "../../../common/errors";

export class ProjectCodeImmutableError extends AppError {
  constructor() {
    super("Project code cannot be changed", {
      code: "project_code_immutable",
      statusCode: 409,
    });
  }
}
