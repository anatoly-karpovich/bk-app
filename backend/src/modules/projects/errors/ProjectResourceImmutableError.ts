import { AppError } from "../../../common/errors";

export class ProjectResourceImmutableError extends AppError {
  constructor(resourceId: string, field: "code" | "type" | "currencyFormat") {
    super(`Project resource "${resourceId}" cannot change its ${field}`, {
      code: "project_resource_immutable",
      statusCode: 409,
      details: { resourceId, field },
    });
  }
}
