import { AnalyticsRefreshInProgressError } from "./errors/AnalyticsRefreshInProgressError";

/**
 * Single-process guard for manual projection refreshes. It intentionally does not
 * provide cross-process coordination; a future multi-instance rollout needs a
 * durable Mongo lease instead.
 */
export class AnalyticsProjectRefreshMutex {
  private readonly activeProjectIds = new Set<string>();

  async runExclusive<T>(projectId: string, operation: () => Promise<T>): Promise<T> {
    if (this.activeProjectIds.has(projectId)) {
      throw new AnalyticsRefreshInProgressError(projectId);
    }

    this.activeProjectIds.add(projectId);
    try {
      return await operation();
    } finally {
      this.activeProjectIds.delete(projectId);
    }
  }
}
