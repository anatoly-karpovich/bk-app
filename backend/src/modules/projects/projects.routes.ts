import { Router } from "express";
import { asyncHandler } from "../../common/http/asyncHandler";
import { ProjectsController } from "./ProjectsController";

export function createProjectsRouter(projectsController: ProjectsController): Router {
  const router = Router();

  router.get("/", asyncHandler(projectsController.listProjects));
  router.post("/", asyncHandler(projectsController.createProject));
  router.get("/:projectId", asyncHandler(projectsController.getProject));
  router.put("/:projectId", asyncHandler(projectsController.updateProject));
  router.delete("/:projectId", asyncHandler(projectsController.deleteProject));

  return router;
}
