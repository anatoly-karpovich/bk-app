import { NotFoundError } from "../../../common/errors";

export class ProjectNotFoundError extends NotFoundError {
  constructor(projectId: string) {
    super(`Project "${projectId}" was not found`, {
      code: "project_not_found",
      details: { projectId },
    });
  }
}
