import { ProjectCodeConflictError, ProjectCurrencyInUseError, ProjectNotFoundError } from "./errors";
import { BattleshipsRepository } from "../battleships/BattleshipsRepository";
import { GameConfigsRepository } from "../gameConfigs/GameConfigsRepository";
import { collectResourceIdsFromRules } from "../gameConfigs/domain/resourceReferences";
import { JourneyRepository } from "../journey/JourneyRepository";
import { LottoRepository } from "../lotto/LottoRepository";
import { normalizeProjectResources } from "./domain/normalizeProjectCurrencies";
import type { Project, ProjectReadModel, ProjectResource } from "./domain/types";
import { ProjectsRepository } from "./ProjectsRepository";

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly gameConfigsRepository: GameConfigsRepository,
    private readonly journeyRepository: JourneyRepository,
    private readonly battleshipsRepository: BattleshipsRepository,
    private readonly lottoRepository: LottoRepository,
  ) {}

  async listProjects(): Promise<ProjectReadModel[]> {
    const projects = await this.repository.findAll();

    const readModels = await Promise.all(projects.map((project) => this.toReadModel(project)));
    return readModels.sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async getProjectByIdOrThrow(projectId: string): Promise<ProjectReadModel> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    return await this.toReadModel(project);
  }

  async createProject(input: {
    code: string;
    name: string;
    description: string;
    resources: Array<Omit<ProjectResource, "createdAt" | "updatedAt">>;
  }): Promise<ProjectReadModel> {
    const code = input.code.trim();
    const existing = await this.repository.findByCode(code);

    if (existing) {
      throw new ProjectCodeConflictError(code);
    }

    const now = new Date().toISOString();
    const created = await this.repository.create({
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      resources: normalizeProjectResources(input.resources, now),
      createdAt: now,
      updatedAt: now,
    });

    if (!created) {
      throw new Error("Failed to load created project");
    }

    return await this.toReadModel(created);
  }

  async updateProject(
    projectId: string,
    input: {
      code: string;
      name: string;
      description: string;
    resources: Array<Omit<ProjectResource, "createdAt" | "updatedAt">>;
    },
  ): Promise<ProjectReadModel> {
    const current = await this.repository.findById(projectId);

    if (!current) {
      throw new ProjectNotFoundError(projectId);
    }

    const code = input.code.trim();
    if (code !== current.code) {
      const existing = await this.repository.findByCode(code);
      if (existing && existing._id.toHexString() !== projectId) {
        throw new ProjectCodeConflictError(code);
      }
    }

    await this.assertUsedResourcesAreNotRemoved(projectId, current.resources, input.resources);

    const updated = await this.repository.update(projectId, {
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      resources: normalizeProjectResources(
        input.resources.map((resource) => ({
          ...resource,
          createdAt: current.resources.find((currentResource) => currentResource.id === resource.id)?.createdAt,
        })),
      ),
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new ProjectNotFoundError(projectId);
    }

    return await this.toReadModel(updated);
  }

  async deleteProject(projectId: string): Promise<void> {
    const current = await this.repository.findById(projectId);
    if (!current) {
      throw new ProjectNotFoundError(projectId);
    }

    await Promise.all([
      this.gameConfigsRepository.deleteByProjectId(projectId),
      this.journeyRepository.deleteByProjectId(projectId),
      this.battleshipsRepository.deleteByProjectId(projectId),
      this.lottoRepository.deleteByProjectId(projectId),
    ]);

    const deleted = await this.repository.delete(projectId);
    if (!deleted) {
      throw new ProjectNotFoundError(projectId);
    }
  }

  private async assertUsedResourcesAreNotRemoved(
    projectId: string,
    currentResources: ProjectResource[],
    nextResources: Array<Omit<ProjectResource, "createdAt" | "updatedAt">>,
  ): Promise<void> {
    const nextResourceIds = new Set(nextResources.map((resource) => resource.id.trim()));
    const removedResourceIds = currentResources.map((resource) => resource.id).filter((resourceId) => !nextResourceIds.has(resourceId));

    if (!removedResourceIds.length) {
      return;
    }

    const configs = await this.gameConfigsRepository.findByProjectId(projectId);
    const usedResourceIds = new Set(configs.flatMap((config) => [...collectResourceIdsFromRules(config.rules)]));
    const inUseCurrencyIds = removedResourceIds.filter((resourceId) => usedResourceIds.has(resourceId));

    if (inUseCurrencyIds.length) {
      throw new ProjectCurrencyInUseError(inUseCurrencyIds);
    }
  }

  private async toReadModel(project: { _id: { toHexString(): string } } & Project): Promise<ProjectReadModel> {
    const configs = await this.gameConfigsRepository.findByProjectId(project._id.toHexString());
    const usedResourceIds = new Set(configs.flatMap((config) => [...collectResourceIdsFromRules(config.rules)]));

    return {
      id: project._id.toHexString(),
      code: project.code,
      name: project.name,
      description: project.description,
      resources: project.resources.map((resource) => ({
        ...structuredClone(resource),
        canDelete: !usedResourceIds.has(resource.id),
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
