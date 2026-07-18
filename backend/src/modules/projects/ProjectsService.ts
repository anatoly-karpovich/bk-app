import { ProjectCodeConflictError, ProjectNotFoundError } from "./errors";
import { BattleshipsRepository } from "../battleships/BattleshipsRepository";
import { GameConfigsRepository } from "../gameConfigs/GameConfigsRepository";
import { JourneyRepository } from "../journey/JourneyRepository";
import { LottoRepository } from "../lotto/LottoRepository";
import { normalizeProjectCurrencies } from "./domain/normalizeProjectCurrencies";
import type { Project, ProjectCurrency, ProjectReadModel } from "./domain/types";
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

    return projects
      .map((project) => ({
        id: project._id.toHexString(),
        code: project.code,
        name: project.name,
        description: project.description,
        currencies: structuredClone(project.currencies),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        legacyConfigId: project.legacyConfigId ?? null,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async getProjectByIdOrThrow(projectId: string): Promise<ProjectReadModel> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    return this.toReadModel(project);
  }

  async createProject(input: {
    code: string;
    name: string;
    description: string;
    currencies: Array<Omit<ProjectCurrency, "createdAt" | "updatedAt">>;
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
      currencies: normalizeProjectCurrencies(input.currencies, now),
      createdAt: now,
      updatedAt: now,
      legacyConfigId: null,
    });

    if (!created) {
      throw new Error("Failed to load created project");
    }

    return this.toReadModel(created);
  }

  async updateProject(
    projectId: string,
    input: {
      code: string;
      name: string;
      description: string;
      currencies: Array<Omit<ProjectCurrency, "createdAt" | "updatedAt">>;
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

    const updated = await this.repository.update(projectId, {
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      currencies: normalizeProjectCurrencies(
        input.currencies.map((currency) => ({
          ...currency,
          createdAt: current.currencies.find((currentCurrency) => currentCurrency.id === currency.id)?.createdAt,
        })),
      ),
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      legacyConfigId: current.legacyConfigId ?? null,
    });

    if (!updated) {
      throw new ProjectNotFoundError(projectId);
    }

    return this.toReadModel(updated);
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

  private toReadModel(project: { _id: { toHexString(): string } } & Project): ProjectReadModel {
    return {
      id: project._id.toHexString(),
      code: project.code,
      name: project.name,
      description: project.description,
      currencies: structuredClone(project.currencies),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      legacyConfigId: project.legacyConfigId ?? null,
    };
  }
}
