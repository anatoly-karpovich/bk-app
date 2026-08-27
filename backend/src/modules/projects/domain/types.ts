import type { Resource } from "../../rewards";
import type { AnalyticsSourceType } from "../../analytics/domain/sourceTypes";

export const PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH = 160;

export interface ProjectActivityTypeSettings {
  type: AnalyticsSourceType;
  defaultTitle: string;
  enabled: boolean;
}

export interface Project {
  code: string;
  name: string;
  description: string;
  resources: ProjectResource[];
  activityTypes?: ProjectActivityTypeSettings[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectResource = Resource & { createdAt: string; updatedAt: string };
export type ProjectCurrency = Extract<ProjectResource, { type: "currency" }>;

export type ProjectResourceReadModel = ProjectResource & { canDelete: boolean };

export type ProjectReadModel = Omit<Project, "resources" | "activityTypes"> & {
  id: string;
  resources: ProjectResourceReadModel[];
  activityTypes: ProjectActivityTypeSettings[];
};
