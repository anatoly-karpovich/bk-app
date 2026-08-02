import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { asyncHandler } from "../../common/http/asyncHandler";
import type { AuthController } from "./AuthController";
import { createRequireAuth, requireRole } from "./auth.middleware";
import type { AuthService } from "./AuthService";

export function createAuthRouter(authController: AuthController, authService: AuthService): Router {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, code: "RATE_LIMITED", message: "Too many login attempts" }),
  });

  router.post("/login", loginLimiter, asyncHandler(authController.login));
  router.post("/logout", asyncHandler(authController.logout));
  router.get("/me", createRequireAuth(authService), asyncHandler(authController.getCurrentUser));
  router.post("/change-password", createRequireAuth(authService), requireRole("admin", "host"), asyncHandler(authController.changePassword));
  router.patch(
    "/project-profiles/:projectId",
    createRequireAuth(authService),
    requireRole("admin", "host"),
    asyncHandler(authController.updateOwnProjectNickname),
  );
  return router;
}
