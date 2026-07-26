import type { Request, Response } from "express";
import { RequestValidationError } from "../../common/errors";
import { parseRequest } from "../../common/validation/parseRequest";
import { projectIdParamsSchema, projectMutationSchema } from "./projects.schemas";
import { ProjectsService } from "./ProjectsService";
import { ProjectCodeConflictError, ProjectCurrencyInUseError, ProjectNotFoundError } from "./errors";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  listProjects = async (_req: Request, res: Response) => {
    try {
      const projects = await this.projectsService.listProjects();

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to load projects",
        error: getErrorMessage(error),
      });
    }
  };

  getProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(
        projectIdParamsSchema,
        req.params,
        "Route parameter 'projectId' must be a valid project id",
      );
      const project = await this.projectsService.getProjectByIdOrThrow(projectId);

      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return res.status(400).json({
          success: false,
          message: "Route parameter 'projectId' must be a valid project id",
        });
      }

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to load project",
        error: getErrorMessage(error),
      });
    }
  };

  createProject = async (req: Request, res: Response) => {
    try {
      const input = parseRequest(projectMutationSchema, req.body, "Invalid project input");
      const project = await this.projectsService.createProject(input);
      return res.status(201).json({ success: true, data: project });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to create project");
    }
  };

  updateProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(projectIdParamsSchema, req.params, "Invalid project id");
      const input = parseRequest(projectMutationSchema, req.body, "Invalid project input");
      const project = await this.projectsService.updateProject(projectId, input);
      return res.status(200).json({ success: true, data: project });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to update project");
    }
  };

  deleteProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = parseRequest(projectIdParamsSchema, req.params, "Invalid project id");
      await this.projectsService.deleteProject(projectId);
      return res.status(200).json({ success: true });
    } catch (error) {
      return this.handleMutationError(error, res, "Failed to delete project");
    }
  };

  private handleMutationError(error: unknown, res: Response, message: string) {
    if (error instanceof RequestValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error instanceof ProjectNotFoundError) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (error instanceof ProjectCodeConflictError || error instanceof ProjectCurrencyInUseError) {
      return res.status(409).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message, error: getErrorMessage(error) });
  }
}
