import { ConfigReadModelFactory } from "./ConfigReadModelFactory";
import { ConfigNameConflictError, ConfigNotFoundError } from "./errors";
import { buildPersistedAppConfig, normalizeAppConfigInput, normalizeStoredAppConfig } from "./domain/normalizeConfig";
import type { AppConfigMutationInput, AppConfigReadModel } from "./domain/types";
import { ConfigsRepository } from "./ConfigsRepository";

export class ConfigsService {
  constructor(
    private readonly repository: ConfigsRepository,
    private readonly readModelFactory: ConfigReadModelFactory,
  ) {}

  async listConfigs(): Promise<AppConfigReadModel[]> {
    const configs = await this.repository.findAll();

    return configs
      .map((config) => this.readModelFactory.create(config))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  async findConfigById(configId: string): Promise<AppConfigReadModel | null> {
    const config = await this.repository.findById(configId);
    return config ? this.readModelFactory.create(config) : null;
  }

  async getConfigByIdOrThrow(configId: string): Promise<AppConfigReadModel> {
    const config = await this.findConfigById(configId);

    if (!config) {
      throw new ConfigNotFoundError(configId);
    }

    return config;
  }

  async createConfig(payload: AppConfigMutationInput): Promise<AppConfigReadModel> {
    const normalizedInput = normalizeAppConfigInput(payload);
    await this.assertConfigNameAvailable(normalizedInput.name);

    const createdConfig = await this.repository.create(buildPersistedAppConfig(payload));

    if (!createdConfig) {
      throw new Error("Failed to load created config");
    }

    return this.readModelFactory.create(createdConfig);
  }

  async updateConfig(configId: string, payload: AppConfigMutationInput): Promise<AppConfigReadModel> {
    const currentConfig = await this.repository.findById(configId);

    if (!currentConfig) {
      throw new ConfigNotFoundError(configId);
    }

    const fallbackTimestamp = currentConfig._id.getTimestamp().toISOString();
    const normalizedCurrentConfig = normalizeStoredAppConfig(currentConfig, fallbackTimestamp);
    const normalizedInput = normalizeAppConfigInput(payload);

    if (normalizedInput.name !== normalizedCurrentConfig.name) {
      const existingConfigWithSameName = await this.repository.findByName(normalizedInput.name);

      if (existingConfigWithSameName && existingConfigWithSameName._id.toHexString() !== configId) {
        throw new ConfigNameConflictError(normalizedInput.name);
      }
    }

    const updatedConfig = await this.repository.update(configId, {
      ...normalizedInput,
      createdAt: normalizedCurrentConfig.createdAt,
      updatedAt: new Date().toISOString(),
    });

    if (!updatedConfig) {
      throw new ConfigNotFoundError(configId);
    }

    return this.readModelFactory.create(updatedConfig);
  }

  async deleteConfig(configId: string): Promise<void> {
    const deleted = await this.repository.delete(configId);

    if (!deleted) {
      throw new ConfigNotFoundError(configId);
    }
  }

  private async assertConfigNameAvailable(configName: string): Promise<void> {
    const existingConfig = await this.repository.findByName(configName);

    if (existingConfig) {
      throw new ConfigNameConflictError(configName);
    }
  }
}
