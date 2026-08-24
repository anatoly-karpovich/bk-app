import { ConflictError } from "../../../common/errors/ConflictError";

/** Raised when a second in-process refresh targets the same project. */
export class AnalyticsRefreshInProgressError extends ConflictError {
  constructor(projectId: string) {
    super(`Analytics refresh is already in progress for project ${projectId}`, {
      code: "analytics_refresh_in_progress",
    });
  }
}
