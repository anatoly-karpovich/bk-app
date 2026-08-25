import { AnalyticsProjectionRepository } from "./AnalyticsProjectionRepository";
import type { AnalyticsSourceKind } from "./domain/sourceTypes";

export interface AnalyticsProjectionInvalidator {
  deleteSourceFact(projectId: string, source: { kind: AnalyticsSourceKind; id: string }): Promise<void>;
  deleteProjectFacts(projectId: string): Promise<void>;
}

export interface AnalyticsInvalidationLogger {
  error(message: string, context: Record<string, unknown>): void;
}

const defaultLogger: AnalyticsInvalidationLogger = {
  error(message, context) {
    console.error(message, context);
  },
};

/** Best-effort cleanup for facts whose canonical source is no longer final or no longer exists. */
export class BestEffortAnalyticsProjectionInvalidator implements AnalyticsProjectionInvalidator {
  constructor(
    private readonly projectionRepository: AnalyticsProjectionRepository,
    private readonly logger: AnalyticsInvalidationLogger = defaultLogger,
  ) {}

  async deleteSourceFact(projectId: string, source: { kind: AnalyticsSourceKind; id: string }): Promise<void> {
    await this.run(
      { operation: "delete_source_fact", projectId, sourceKind: source.kind, sourceId: source.id },
      () => this.projectionRepository.deleteBySourceKey(projectId, source.kind, source.id),
    );
  }

  async deleteProjectFacts(projectId: string): Promise<void> {
    await this.run(
      { operation: "delete_project_facts", projectId },
      () => this.projectionRepository.deleteByProjectId(projectId),
    );
  }

  private async run(context: Record<string, unknown>, operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this.logger.error("Analytics projection invalidation failed", { ...context, error });
    }
  }
}
