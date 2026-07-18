import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import type { ProjectCurrency } from "../projects/domain/types";
import { normalizeBattleshipsRules } from "../battleships/domain/config";
import type { BattleshipsRulesInput } from "../battleships/domain/types";
import { normalizeJourneyRules } from "../journey/domain/config";
import type { JourneyRulesInput } from "../journey/domain/types";
import { normalizeLottoRules } from "../lotto/domain/config";
import type { LottoRulesInput } from "../lotto/domain/types";
import { GameConfigReadModelFactory } from "./GameConfigReadModelFactory";
import { GameConfigsRepository } from "./GameConfigsRepository";
import type {
  AnyGameConfig,
  AnyGameConfigReadModel,
  BattleshipsGameConfig,
  GameConfigContext,
  GameType,
  JourneyGameConfig,
  LottoGameConfig,
} from "./domain/types";
import { GameConfigCurrencyValidationError, GameConfigNameConflictError, GameConfigNotFoundError } from "./errors";

export class GameConfigsService {
  constructor(
    private readonly repository: GameConfigsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly readModelFactory: GameConfigReadModelFactory,
  ) {}

  async listProjectGameConfigs(projectId: string, gameType: GameType): Promise<AnyGameConfigReadModel[]> {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const configs = await this.repository.findByProjectIdAndGameType(projectId, gameType);

    return configs
      .map((config) =>
        this.readModelFactory.create(config._id.toHexString(), config as unknown as AnyGameConfig, project.currencies),
      )
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async getProjectGameConfig(projectId: string, gameConfigId: string): Promise<AnyGameConfigReadModel> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const config = await this.repository.findByIdAndProjectId(gameConfigId, projectId);
    if (!config) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }

    return this.readModelFactory.create(config._id.toHexString(), config as unknown as AnyGameConfig, project.currencies);
  }

  async createProjectGameConfig(
    projectId: string,
    input: { gameType: GameType; name: string; description: string; rules: unknown },
  ): Promise<AnyGameConfigReadModel> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const name = input.name.trim();
    await this.assertNameAvailable(projectId, input.gameType, name);
    const now = new Date().toISOString();
    const rules = this.normalizeRules(input.gameType, input.rules);
    this.assertRulesUseProjectCurrencies(rules, project.currencies);
    const created = await this.repository.create({
      projectId,
      gameType: input.gameType,
      name,
      description: input.description.trim(),
      rules,
      createdAt: now,
      updatedAt: now,
      legacyConfigId: null,
    });

    if (!created) {
      throw new Error("Failed to load created game config");
    }

    return this.readModelFactory.create(created._id.toHexString(), created as unknown as AnyGameConfig, project.currencies);
  }

  async updateProjectGameConfig(
    projectId: string,
    gameConfigId: string,
    input: { name: string; description: string; rules: unknown },
  ): Promise<AnyGameConfigReadModel> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const current = await this.repository.findByIdAndProjectId(gameConfigId, projectId);
    if (!current) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }

    const name = input.name.trim();
    if (name !== current.name) {
      await this.assertNameAvailable(projectId, current.gameType, name, gameConfigId);
    }

    const rules = this.normalizeRules(current.gameType, input.rules);
    this.assertRulesUseProjectCurrencies(rules, project.currencies);
    const updated = await this.repository.update(projectId, gameConfigId, {
      projectId,
      gameType: current.gameType,
      name,
      description: input.description.trim(),
      rules,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      legacyConfigId: current.legacyConfigId ?? null,
    });

    if (!updated) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }

    return this.readModelFactory.create(updated._id.toHexString(), updated as unknown as AnyGameConfig, project.currencies);
  }

  async deleteProjectGameConfig(projectId: string, gameConfigId: string): Promise<void> {
    const deleted = await this.repository.delete(projectId, gameConfigId);
    if (!deleted) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }
  }

  async getJourneyGameConfigContext(projectId: string, gameConfigId: string): Promise<GameConfigContext<JourneyGameConfig>> {
    return this.getGameConfigContext(projectId, gameConfigId, "journey") as Promise<GameConfigContext<JourneyGameConfig>>;
  }

  async getBattleshipsGameConfigContext(
    projectId: string,
    gameConfigId: string,
  ): Promise<GameConfigContext<BattleshipsGameConfig>> {
    return this.getGameConfigContext(
      projectId,
      gameConfigId,
      "battleships",
    ) as Promise<GameConfigContext<BattleshipsGameConfig>>;
  }

  async getLottoGameConfigContext(projectId: string, gameConfigId: string): Promise<GameConfigContext<LottoGameConfig>> {
    return this.getGameConfigContext(projectId, gameConfigId, "lotto") as Promise<GameConfigContext<LottoGameConfig>>;
  }

  private async getGameConfigContext(
    projectId: string,
    gameConfigId: string,
    gameType: GameType,
  ): Promise<GameConfigContext> {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const config = await this.repository.findByIdAndProjectId(gameConfigId, projectId);

    if (!config || config.gameType !== gameType) {
      throw new GameConfigNotFoundError(projectId, gameConfigId, gameType);
    }

    return {
      projectCurrencies: structuredClone(project.currencies),
      config: structuredClone(config as unknown as AnyGameConfig),
    };
  }

  private async assertNameAvailable(
    projectId: string,
    gameType: GameType,
    name: string,
    currentGameConfigId?: string,
  ): Promise<void> {
    const existing = await this.repository.findByProjectIdGameTypeAndName(projectId, gameType, name);
    if (existing && existing._id.toHexString() !== currentGameConfigId) {
      throw new GameConfigNameConflictError(projectId, gameType, name);
    }
  }

  private normalizeRules(gameType: GameType, rules: unknown) {
    switch (gameType) {
      case "journey":
        return normalizeJourneyRules(rules as JourneyRulesInput);
      case "battleships":
        return normalizeBattleshipsRules(rules as BattleshipsRulesInput);
      case "lotto":
        return normalizeLottoRules(rules as LottoRulesInput);
    }
  }

  private assertRulesUseProjectCurrencies(rules: unknown, currencies: ProjectCurrency[]): void {
    const currenciesById = new Map(currencies.map((currency) => [currency.id, currency]));
    const visited = new Set<unknown>();

    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object" || visited.has(value)) {
        return;
      }

      visited.add(value);
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      const record = value as Record<string, unknown>;
      if (typeof record.currencyId === "string") {
        const currency = currenciesById.get(record.currencyId);
        if (!currency) {
          throw new GameConfigCurrencyValidationError(`Unknown project currency "${record.currencyId}" in game rules`);
        }

        if (typeof record.value === "number") {
          if (!Number.isFinite(record.value)) {
            throw new GameConfigCurrencyValidationError(`Currency value for "${record.currencyId}" must be finite`);
          }

          const scaledValue = record.value * 10 ** currency.precision;
          if (!Number.isInteger(scaledValue)) {
            throw new GameConfigCurrencyValidationError(
              `Currency value for "${record.currencyId}" exceeds precision ${currency.precision}`,
            );
          }
        }
      }

      Object.values(record).forEach(visit);
    };

    visit(rules);
  }
}
