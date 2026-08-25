import { ANALYTICS_SOURCE_TYPES, type AnalyticsSourceType } from "./domain/sourceTypes";
import type { AnalyticsFactDocument, AnalyticsFactIssue, AnalyticsSourceStamp } from "./domain/types";
import type { AnalyticsProjectionPreviewReport } from "./AnalyticsProjectionService";

export interface AnalyticsBackfillDryRunReport {
  projectId: string;
  factsBuilt: number;
  sourceCountsByType: Record<AnalyticsSourceType, number>;
  participations: number;
  partialFacts: Array<{ source: AnalyticsSourceStamp; issues: AnalyticsFactIssue[] }>;
  rewardsByResource: Array<{
    resourceId: string;
    regular: number;
    bonus: number;
    total: number;
  }>;
}

interface AnalyticsProjectionPreviewPort {
  previewProject(projectId: string): Promise<AnalyticsProjectionPreviewReport>;
}

/** Produces an offline backfill report from validated facts without persisting them. */
export class AnalyticsBackfillDryRunService {
  constructor(private readonly projectionService: AnalyticsProjectionPreviewPort) {}

  async inspectProject(projectId: string): Promise<AnalyticsBackfillDryRunReport> {
    const preview = await this.projectionService.previewProject(projectId);
    return this.toReport(projectId, preview.facts);
  }

  private toReport(projectId: string, facts: ReadonlyArray<AnalyticsFactDocument>): AnalyticsBackfillDryRunReport {
    const sourceCountsByType = this.emptySourceCounts();
    const rewardsByResource = new Map<string, { regular: number; bonus: number }>();
    let participations = 0;

    for (const fact of facts) {
      sourceCountsByType[fact.source.type] += 1;
      participations += fact.participants.length;
      for (const participant of fact.participants) {
        this.addRewards(rewardsByResource, participant.rewards.regular, "regular");
        this.addRewards(rewardsByResource, participant.rewards.bonus, "bonus");
      }
    }

    return {
      projectId,
      factsBuilt: facts.length,
      sourceCountsByType,
      participations,
      partialFacts: facts
        .filter((fact) => fact.meta.status === "partial")
        .map((fact) => ({ source: fact.source, issues: fact.meta.issues })),
      rewardsByResource: [...rewardsByResource.entries()]
        .map(([resourceId, rewards]) => ({
          resourceId,
          regular: rewards.regular,
          bonus: rewards.bonus,
          total: rewards.regular + rewards.bonus,
        }))
        .sort((left, right) => left.resourceId.localeCompare(right.resourceId)),
    };
  }

  private addRewards(
    totals: Map<string, { regular: number; bonus: number }>,
    rewards: AnalyticsFactDocument["participants"][number]["rewards"]["regular"],
    category: "regular" | "bonus",
  ): void {
    for (const reward of rewards) {
      const entry = totals.get(reward.resourceId) ?? { regular: 0, bonus: 0 };
      entry[category] += reward.amount;
      totals.set(reward.resourceId, entry);
    }
  }

  private emptySourceCounts(): Record<AnalyticsSourceType, number> {
    return Object.fromEntries(ANALYTICS_SOURCE_TYPES.map((type) => [type, 0])) as Record<AnalyticsSourceType, number>;
  }
}
