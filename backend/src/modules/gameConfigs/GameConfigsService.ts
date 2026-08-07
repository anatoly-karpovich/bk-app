import { ProjectNotFoundError } from "../projects/errors";
import { ProjectsRepository } from "../projects/ProjectsRepository";
import type { ProjectResource } from "../projects/domain/types";
import { getCurrencySnapshots } from "../rewards";
import { normalizeBattleshipsRules, validateBattleshipsRules } from "../battleships/domain/config";
import type { BattleshipsRulesInput } from "../battleships/domain/types";
import { normalizeJourneyRules, validateJourneyRules } from "../journey/domain/config";
import type { JourneyRulesInput } from "../journey/domain/types";
import { normalizeLottoRules, validateLottoRules } from "../lotto/domain/config";
import type { LottoRulesInput } from "../lotto/domain/types";
import { normalizeLottoBingoRules, validateLottoBingoRules } from "../lottoBingo/domain/config";
import type { LottoBingoRulesInput } from "../lottoBingo/domain/types";
import { GameConfigReadModelFactory } from "./GameConfigReadModelFactory";
import { GameConfigsRepository } from "./GameConfigsRepository";
import { collectResourceIdsFromRules } from "./domain/resourceReferences";
import type {
  AnyGameConfig,
  AnyGameConfigReadModel,
  BattleshipsGameConfig,
  GameConfigContext,
  GameType,
  JourneyGameConfig,
  LottoGameConfig,
  LottoBingoGameConfig,
} from "./domain/types";
import { GameConfigCurrencyValidationError, GameConfigNameConflictError, GameConfigNotFoundError } from "./errors";
import type { CurrentUser } from "../auth/domain/types";
import { assertOwnedByUser, assertProjectAccess } from "../auth/authorization";
import { ForbiddenError } from "../../common/errors";

export class GameConfigsService {
  constructor(
    private readonly repository: GameConfigsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly readModelFactory: GameConfigReadModelFactory,
  ) {}

  async listProjectGameConfigs(actor: CurrentUser, projectId: string, gameType: GameType): Promise<AnyGameConfigReadModel[]> {
    assertProjectAccess(actor, projectId);
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const configs = await this.repository.findByProjectIdAndGameType(projectId, gameType);

    return configs
      .map((config) =>
        this.readModelFactory.create(config._id.toHexString(), config as unknown as AnyGameConfig, getCurrencySnapshots(project.resources), project.resources),
      )
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async getProjectGameConfig(actor: CurrentUser, projectId: string, gameConfigId: string): Promise<AnyGameConfigReadModel> {
    assertProjectAccess(actor, projectId);
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const config = await this.repository.findByIdAndProjectId(gameConfigId, projectId);
    if (!config) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }

    return this.readModelFactory.create(config._id.toHexString(), config as unknown as AnyGameConfig, getCurrencySnapshots(project.resources), project.resources);
  }

  async createProjectGameConfig(
    actor: CurrentUser,
    projectId: string,
    input: { gameType: GameType; name: string; description: string; rules: unknown },
  ): Promise<AnyGameConfigReadModel> {
    assertProjectAccess(actor, projectId);
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const name = input.name.trim();
    await this.assertNameAvailable(projectId, input.gameType, name);
    const rules = this.normalizeRules(input.gameType, input.rules);
    this.assertRulesUseProjectResources(rules, project.resources);
    if (input.gameType === "journey") validateJourneyRules(rules as ReturnType<typeof normalizeJourneyRules>, project.resources);
    if (input.gameType === "battleships") validateBattleshipsRules(rules as ReturnType<typeof normalizeBattleshipsRules>, project.resources);
    if (input.gameType === "lotto") validateLottoRules(rules as ReturnType<typeof normalizeLottoRules>, project.resources);
    if (input.gameType === "lotto_bingo") validateLottoBingoRules(rules as ReturnType<typeof normalizeLottoBingoRules>, project.resources);
    const now = new Date().toISOString();
    const created = await this.repository.create({
      projectId,
      gameType: input.gameType,
      name,
      description: input.description.trim(),
      rules,
      isSystem: false,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      createdAt: now,
      updatedAt: now,
    });

    if (!created) {
      throw new Error("Failed to load created game config");
    }

    return this.readModelFactory.create(created._id.toHexString(), created as unknown as AnyGameConfig, getCurrencySnapshots(project.resources), project.resources);
  }

  async updateProjectGameConfig(
    actor: CurrentUser,
    projectId: string,
    gameConfigId: string,
    input: { name: string; description: string; rules: unknown },
  ): Promise<AnyGameConfigReadModel> {
    assertProjectAccess(actor, projectId);
    const project = await this.projectsRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const current = await this.repository.findByIdAndProjectId(gameConfigId, projectId);
    if (!current) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }
    if (current.isSystem && actor.role !== "admin") throw new ForbiddenError();
    if (!current.isSystem) assertOwnedByUser(actor, current.createdByUserId);

    const name = input.name.trim();
    if (name !== current.name) {
      await this.assertNameAvailable(projectId, current.gameType, name, gameConfigId);
    }

    const rules = this.normalizeRules(current.gameType, input.rules);
    this.assertRulesUseProjectResources(rules, project.resources);
    if (current.gameType === "journey") validateJourneyRules(rules as ReturnType<typeof normalizeJourneyRules>, project.resources);
    if (current.gameType === "battleships") validateBattleshipsRules(rules as ReturnType<typeof normalizeBattleshipsRules>, project.resources);
    if (current.gameType === "lotto") validateLottoRules(rules as ReturnType<typeof normalizeLottoRules>, project.resources);
    if (current.gameType === "lotto_bingo") validateLottoBingoRules(rules as ReturnType<typeof normalizeLottoBingoRules>, project.resources);
    const updated = await this.repository.update(projectId, gameConfigId, {
      projectId,
      gameType: current.gameType,
      name,
      description: input.description.trim(),
      rules,
      isSystem: current.isSystem,
      createdByUserId: current.createdByUserId,
      updatedByUserId: actor.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new GameConfigNotFoundError(projectId, gameConfigId);
    }

    return this.readModelFactory.create(updated._id.toHexString(), updated as unknown as AnyGameConfig, getCurrencySnapshots(project.resources), project.resources);
  }

  async deleteProjectGameConfig(actor: CurrentUser, projectId: string, gameConfigId: string): Promise<void> {
    assertProjectAccess(actor, projectId);
    const current = await this.repository.findByIdAndProjectId(gameConfigId, projectId);
    if (!current) throw new GameConfigNotFoundError(projectId, gameConfigId);
    if (current.isSystem) throw new ForbiddenError("System configs cannot be deleted", { code: "FORBIDDEN" });
    assertOwnedByUser(actor, current.createdByUserId);
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

  async getLottoBingoGameConfigContext(projectId: string, gameConfigId: string): Promise<GameConfigContext<LottoBingoGameConfig>> {
    return this.getGameConfigContext(projectId, gameConfigId, "lotto_bingo") as Promise<GameConfigContext<LottoBingoGameConfig>>;
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
      projectCurrencies: getCurrencySnapshots(project.resources),
      projectResources: structuredClone(project.resources),
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
      case "lotto_bingo":
        return normalizeLottoBingoRules(rules as LottoBingoRulesInput);
    }
  }

  private assertRulesUseProjectResources(rules: unknown, resources: ProjectResource[]): void {
    const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
    const visited = new Set<unknown>();
    const resourceIds = collectResourceIdsFromRules(rules);

    for (const resourceId of resourceIds) {
      if (!resourcesById.has(resourceId)) {
        throw new GameConfigCurrencyValidationError(`Unknown project resource "${resourceId}" in game rules`);
      }
    }

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
      if (typeof record.resourceId === "string" && typeof record.amount === "number") {
        const resource = resourcesById.get(record.resourceId)!;
        if (!Number.isFinite(record.amount) || record.amount === 0) {
          throw new GameConfigCurrencyValidationError(`Resource amount for "${record.resourceId}" must be finite and non-zero`);
        }
        if (resource.type === "item" && (!Number.isSafeInteger(record.amount) || record.amount < 0)) {
          throw new GameConfigCurrencyValidationError(`Item amount for "${record.resourceId}" must be a positive integer`);
        }
        const scaledValue = record.amount * 10 ** (resource.type === "currency" ? resource.precision : 0);
        if (!Number.isInteger(scaledValue)) {
          throw new GameConfigCurrencyValidationError(
            `Resource amount for "${record.resourceId}" exceeds allowed precision`,
          );
        }
      }

      Object.values(record).forEach(visit);
    };

    visit(rules);
  }
}
