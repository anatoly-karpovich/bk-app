import { AppError } from "../../../common/errors";

export class ProjectCurrencyInUseError extends AppError {
  constructor(currencyIds: string[]) {
    super(`Cannot remove currencies used by game configs: ${currencyIds.join(", ")}`, {
      code: "project_currency_in_use",
      statusCode: 409,
      details: { currencyIds },
    });
  }
}
