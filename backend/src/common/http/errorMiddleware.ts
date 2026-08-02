import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      error: error.expose ? error.message : undefined,
    });
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    error: message,
  });
}
