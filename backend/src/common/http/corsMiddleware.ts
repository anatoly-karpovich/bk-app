import type { NextFunction, Request, Response } from "express";
import { getAllowedOrigins } from "../../modules/auth/auth.config";

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  if (origin && getAllowedOrigins().includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,X-BK-Client");
    res.status(204).send();
    return;
  }
  next();
}
