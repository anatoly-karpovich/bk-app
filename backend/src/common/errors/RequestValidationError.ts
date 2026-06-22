import type { ZodIssue } from "zod";
import { AppError } from "./AppError";

export class RequestValidationError extends AppError {
  public readonly issues: ZodIssue[];

  constructor(message: string, issues: ZodIssue[]) {
    super(message, {
      code: "request_validation_error",
      details: issues,
      statusCode: 400,
    });
    this.issues = issues;
  }
}
