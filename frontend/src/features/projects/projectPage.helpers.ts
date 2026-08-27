import type {
  AnyGameConfig,
  Project,
  ProjectActivityTypeSettings,
  ProjectCurrency,
  ProjectItem,
  ProjectMutationInput,
} from "./types";
import { projectTexts } from "../../texts/projectTexts";

export const PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH = 160;

export type ProjectCurrencyDraft = Omit<ProjectCurrency, "createdAt" | "updatedAt"> & { isNew: boolean };
export type ProjectItemDraft = Omit<ProjectItem, "createdAt" | "updatedAt"> & { isNew: boolean };
export type ProjectResourceDraft = ProjectCurrencyDraft | ProjectItemDraft;

export interface ProjectDraft {
  name: string;
  description: string;
  resources: ProjectResourceDraft[];
  activityTypes: ProjectActivityTypeSettings[];
}

export interface ResourceConfigUsage {
  gameName: string;
  configName: string;
  usageLabel: string;
}

function createResourceId(): string {
  return `resource_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toProjectDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    description: project.description,
    resources: project.resources.map((resource) => ({ ...resource, isNew: false })),
    activityTypes: structuredClone(project.activityTypes),
  };
}

export function createCurrencyDraft(): ProjectCurrencyDraft {
  const id = createResourceId();

  return {
    type: "currency",
    id,
    code: id,
    name: "",
    label: "",
    valueType: "integer",
    precision: 0,
    canDelete: true,
    isNew: true,
  };
}

export function createItemDraft(): ProjectItemDraft {
  const id = createResourceId();

  return {
    type: "item",
    id,
    code: id,
    name: "",
    label: "",
    canDelete: true,
    isNew: true,
  };
}

export function toProjectMutationInput(project: Project, draft: ProjectDraft): ProjectMutationInput {
  return {
    code: project.code,
    name: draft.name.trim(),
    description: draft.description.trim(),
    resources: draft.resources.map(({ isNew: _isNew, canDelete: _canDelete, ...resource }) => ({
      ...resource,
      name: resource.label.trim(),
    })),
    activityTypes: structuredClone(draft.activityTypes),
  };
}

export function isProjectDraftValid(draft: ProjectDraft): boolean {
  const resourceIds = new Set<string>();
  const resourceCodes = new Set<string>();
  const activityTypes = new Set<string>();

  if (!draft.name.trim() || !draft.resources.length || !draft.activityTypes.length) {
    return false;
  }

  const resourcesAreValid = draft.resources.every((resource) => {
    const id = resource.id.trim();
    const code = resource.code.trim();
    if (!id || !code || !resource.label.trim() || resourceIds.has(id) || resourceCodes.has(code)) {
      return false;
    }

    resourceIds.add(id);
    resourceCodes.add(code);

    return resource.type !== "currency" || (
      (resource.valueType === "integer" && resource.precision === 0) ||
      (resource.valueType === "decimal" && Number.isInteger(resource.precision) && resource.precision >= 0 && resource.precision <= 1)
    );
  });

  const activityTypesAreValid = draft.activityTypes.every((activityType) => {
    const type = activityType.type.trim();
    const defaultTitle = activityType.defaultTitle.trim();
    if (!type || !defaultTitle || defaultTitle.length > PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH || activityTypes.has(type)) {
      return false;
    }

    activityTypes.add(type);
    return true;
  });

  return resourcesAreValid && activityTypesAreValid;
}

function configReferencesResource(config: AnyGameConfig, resourceId: string): boolean {
  const visited = new Set<unknown>();

  function visit(value: unknown): boolean {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return false;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      return value.some(visit);
    }

    const record = value as Record<string, unknown>;
    if (record.resourceId === resourceId) {
      return true;
    }

    return Object.values(record).some(visit);
  }

  return visit(config.rules);
}

export function getResourceConfigUsages(resourceId: string, gameConfigs: readonly AnyGameConfig[]): ResourceConfigUsage[] {
  return gameConfigs
    .filter((config) => configReferencesResource(config, resourceId))
    .map((config) => ({
      gameName: projectTexts.usage.gameNames[config.gameType],
      configName: config.name,
      usageLabel: projectTexts.usage.rulesAndRewards,
    }));
}
