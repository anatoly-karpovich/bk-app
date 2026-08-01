import type { Resource } from "../../rewards";

export interface Project {
  code: string;
  name: string;
  description: string;
  resources: ProjectResource[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectResource = Resource & { createdAt: string; updatedAt: string };
export type ProjectCurrency = Extract<ProjectResource, { type: "currency" }>;

export type ProjectResourceReadModel = ProjectResource & { canDelete: boolean };

export type ProjectReadModel = Omit<Project, "resources"> & {
  id: string;
  resources: ProjectResourceReadModel[];
};
