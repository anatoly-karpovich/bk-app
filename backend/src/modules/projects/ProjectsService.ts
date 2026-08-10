import {
  ProjectCodeConflictError,
  ProjectCodeImmutableError,
  ProjectCurrencyInUseError,
  ProjectNotFoundError,
  ProjectResourceImmutableError,
} from "./errors";
import { BattleshipsRepository } from "../battleships/BattleshipsRepository";
import { GameConfigsRepository } from "../gameConfigs/GameConfigsRepository";
import { collectResourceIdsFromRules } from "../gameConfigs/domain/resourceReferences";
import { JourneyRepository } from "../journey/JourneyRepository";
import { LottoRepository } from "../lotto/LottoRepository";
import { LottoBingoRepository } from "../lottoBingo/LottoBingoRepository";
import { normalizeProjectResources } from "./domain/normalizeProjectCurrencies";
import type { Project, ProjectCurrency, ProjectReadModel, ProjectResource } from "./domain/types";
import { ProjectsRepository } from "./ProjectsRepository";
import type { CurrentUser } from "../auth/domain/types";
import { assertProjectAccess } from "../auth/authorization";
import { UsersRepository } from "../auth/UsersRepository";
import { QuizConfigsRepository } from "../quizzes/QuizConfigsRepository";
import { QuizzesRepository } from "../quizzes/QuizzesRepository";
import { QuizEventsRepository } from "../quizzes/QuizEventsRepository";
import { collectResourceIds as collectQuizResourceIds } from "../quizzes/domain/validation";

const DEFAULT_ADMIN_PROJECT_NICKNAME = "Геральт из Ривии";

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly gameConfigsRepository: GameConfigsRepository,
    private readonly journeyRepository: JourneyRepository,
    private readonly battleshipsRepository: BattleshipsRepository,
    private readonly lottoRepository: LottoRepository,
    private readonly lottoBingoRepository: LottoBingoRepository,
    private readonly usersRepository: UsersRepository,
    private readonly quizConfigsRepository: QuizConfigsRepository,
    private readonly quizzesRepository: QuizzesRepository,
    private readonly quizEventsRepository: QuizEventsRepository,
  ) {}

  async listProjects(actor: CurrentUser): Promise<ProjectReadModel[]> {
    const projects = await this.repository.findAll();
    const visibleProjects =
      actor.role === "admin"
        ? projects
        : projects.filter((project) =>
            actor.projectProfiles.some((profile) => profile.projectId === project._id.toHexString()),
          );
    const readModels = await Promise.all(visibleProjects.map((project) => this.toReadModel(project)));
    return readModels.sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async getProjectByIdOrThrow(actor: CurrentUser, projectId: string): Promise<ProjectReadModel> {
    assertProjectAccess(actor, projectId);
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    return await this.toReadModel(project);
  }

  async createProject(
    actor: CurrentUser,
    input: {
      code: string;
      name: string;
      description: string;
      resources: Array<Omit<ProjectResource, "createdAt" | "updatedAt">>;
    },
  ): Promise<ProjectReadModel> {
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
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      createdAt: now,
      updatedAt: now,
    });

    if (!created) {
      throw new Error("Failed to load created project");
    }

    const project = await this.toReadModel(created);
    const currentUser = await this.usersRepository.findById(actor.id);
    if (currentUser && !currentUser.projectProfiles.some((profile) => profile.projectId === project.id)) {
      await this.usersRepository.updateById(actor.id, {
        projectProfiles: [
          ...currentUser.projectProfiles,
          { projectId: project.id, nickname: DEFAULT_ADMIN_PROJECT_NICKNAME },
        ],
        updatedAt: new Date(),
        updatedByUserId: actor.id,
      });
    }
    return project;
  }

  async updateProject(
    actor: CurrentUser,
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
      throw new ProjectCodeImmutableError();
    }

    const usedResourceIds = await this.assertUsedResourcesAreNotRemoved(projectId, current.resources, input.resources);
    this.assertExistingResourcesAreCompatible(current.resources, input.resources, usedResourceIds);

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
      createdByUserId: current.createdByUserId,
      updatedByUserId: actor.id,
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
      this.lottoBingoRepository.deleteByProjectId(projectId),
      this.quizConfigsRepository.deleteByProjectId(projectId),
      this.quizzesRepository.deleteByProjectId(projectId),
      this.quizEventsRepository.deleteByProjectId(projectId),
      this.usersRepository.removeProjectProfiles(projectId),
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
  ): Promise<Set<string>> {
    const nextResourceIds = new Set(nextResources.map((resource) => resource.id.trim()));
    const removedResourceIds = currentResources
      .map((resource) => resource.id)
      .filter((resourceId) => !nextResourceIds.has(resourceId));
    const configs = await this.gameConfigsRepository.findByProjectId(projectId);
    const quizConfigs = await this.quizConfigsRepository.findByProjectId(projectId);
    const usedResourceIds = new Set([
      ...configs.flatMap((config) => [...collectResourceIdsFromRules(config.rules)]),
      ...quizConfigs.flatMap((config) => [...collectQuizResourceIds(config)]),
    ]);

    if (!removedResourceIds.length) {
      return usedResourceIds;
    }

    const inUseCurrencyIds = removedResourceIds.filter((resourceId) => usedResourceIds.has(resourceId));

    if (inUseCurrencyIds.length) {
      throw new ProjectCurrencyInUseError(inUseCurrencyIds);
    }

    return usedResourceIds;
  }

  private assertExistingResourcesAreCompatible(
    currentResources: ProjectResource[],
    nextResources: Array<Omit<ProjectResource, "createdAt" | "updatedAt">>,
    usedResourceIds: Set<string>,
  ): void {
    const nextResourcesById = new Map(nextResources.map((resource) => [resource.id.trim(), resource]));

    for (const currentResource of currentResources) {
      const nextResource = nextResourcesById.get(currentResource.id);
      if (!nextResource) {
        continue;
      }

      if (nextResource.code.trim() !== currentResource.code) {
        throw new ProjectResourceImmutableError(currentResource.id, "code");
      }

      if (nextResource.type !== currentResource.type) {
        throw new ProjectResourceImmutableError(currentResource.id, "type");
      }

      if (
        usedResourceIds.has(currentResource.id) &&
        currentResource.type === "currency" &&
        nextResource.type === "currency"
      ) {
        const nextCurrency = nextResource as Omit<ProjectCurrency, "createdAt" | "updatedAt">;
        if (
          nextCurrency.valueType !== currentResource.valueType ||
          nextCurrency.precision !== currentResource.precision
        ) {
          throw new ProjectResourceImmutableError(currentResource.id, "currencyFormat");
        }
      }
    }
  }

  private async toReadModel(project: { _id: { toHexString(): string } } & Project): Promise<ProjectReadModel> {
    const configs = await this.gameConfigsRepository.findByProjectId(project._id.toHexString());
    const quizConfigs = await this.quizConfigsRepository.findByProjectId(project._id.toHexString());
    const usedResourceIds = new Set([
      ...configs.flatMap((config) => [...collectResourceIdsFromRules(config.rules)]),
      ...quizConfigs.flatMap((config) => [...collectQuizResourceIds(config)]),
    ]);

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
      createdByUserId: project.createdByUserId,
      updatedByUserId: project.updatedByUserId,
    };
  }
}
