import type { ZodType } from "zod";
import { RequestValidationError } from "../errors";

export function parseRequest<TOutput>(
  schema: ZodType<TOutput>,
  data: unknown,
  errorMessage = "Request validation failed",
): TOutput {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new RequestValidationError(errorMessage, result.error.issues);
  }

  return result.data;
}
