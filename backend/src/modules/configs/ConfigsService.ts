import { ConfigReadModelFactory } from "./ConfigReadModelFactory";
import { ConfigNotFoundError } from "./errors";
import { DEFAULT_APP_CONFIGS } from "./domain/defaultConfigs";
import type { AppConfigReadModel } from "./domain/types";
import { ConfigsRepository } from "./ConfigsRepository";

export class ConfigsService {
  constructor(
    private readonly repository: ConfigsRepository,
    private readonly readModelFactory: ConfigReadModelFactory,
  ) {}

  async listConfigs(): Promise<AppConfigReadModel[]> {
    const configs = await this.repository.findAll();
    const preferredOrder = new Map(DEFAULT_APP_CONFIGS.map((config, index) => [config.id, index]));

    return configs
      .sort((left, right) => {
        const leftIndex = preferredOrder.get(left.id);
        const rightIndex = preferredOrder.get(right.id);

        if (leftIndex !== undefined && rightIndex !== undefined) {
          return leftIndex - rightIndex;
        }

        if (leftIndex !== undefined) {
          return -1;
        }

        if (rightIndex !== undefined) {
          return 1;
        }

        return left.name.localeCompare(right.name, "ru");
      })
      .map((config) => this.readModelFactory.create(config));
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
}
