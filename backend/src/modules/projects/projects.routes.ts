import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ProjectsController } from "./ProjectsController";
import { requireRole } from "../auth/auth.middleware";

export function createProjectsRouter(projectsController: ProjectsController): Router {
  const router = Router();

  router.get("/", asyncHandler(projectsController.listProjects));
  router.post("/", requireRole("admin"), asyncHandler(projectsController.createProject));
  router.get("/:projectId", asyncHandler(projectsController.getProject));
  router.put("/:projectId", requireRole("admin"), asyncHandler(projectsController.updateProject));
  router.delete("/:projectId", requireRole("admin"), asyncHandler(projectsController.deleteProject));

  return router;
}
