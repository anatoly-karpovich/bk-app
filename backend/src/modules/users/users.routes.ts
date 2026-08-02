import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { requireRole } from "../auth/auth.middleware";
import { UsersController } from "./UsersController";

export function createUsersRouter(usersController: UsersController): Router {
  const router = Router();
  router.use(requireRole("admin"));
  router.get("/", asyncHandler(usersController.listUsers));
  router.post("/", asyncHandler(usersController.createUser));
  router.get("/:userId", asyncHandler(usersController.getUser));
  router.patch("/:userId", asyncHandler(usersController.updateUser));
  router.post("/:userId/block", asyncHandler(usersController.blockUser));
  router.post("/:userId/unblock", asyncHandler(usersController.unblockUser));
  router.post("/:userId/reset-password", asyncHandler(usersController.resetPassword));
  return router;
}
