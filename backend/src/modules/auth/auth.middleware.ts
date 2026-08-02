import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../../common/errors";
import { AuthService } from "./AuthService";
import { getSessionToken } from "./AuthController";
import type { UserRole } from "./domain/types";

export function createRequireAuth(authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.authUser = await authService.getCurrentUser(getSessionToken(req));
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      next(new ForbiddenError("Forbidden", { code: "FORBIDDEN" }));
      return;
    }
    next();
  };
}

export function requireTrustedClient(req: Request, _res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.get("X-BK-Client") === "web") {
    next();
    return;
  }
  next(new ForbiddenError("Request origin validation failed", { code: "CSRF_CHECK_FAILED" }));
}
