import { AppError } from "../../../common/errors/AppError";
import type { AnalyticsSourceType } from "../domain/sourceTypes";

/**
 * Keeps an invalid canonical source from being projected as invented analytics data.
 * Source identifiers remain available to structured server logging through `details`,
 * but are not a public API contract.
 */
export class AnalyticsProjectionBuildError extends AppError {
  constructor(sourceType: AnalyticsSourceType, sourceId: string | undefined, cause: unknown) {
    super("Unable to build analytics projection", {
      cause,
      code: "analytics_projection_build_failed",
      details: { sourceType, sourceId },
      expose: false,
      statusCode: 500,
    });
  }
}
