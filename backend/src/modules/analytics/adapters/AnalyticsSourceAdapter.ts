import type { AnalyticsFactDocument, AnalyticsSourceStamp } from "../domain/types";
import type { AnalyticsSourceType } from "../domain/sourceTypes";

export interface AnalyticsSourceDescriptor {
  projectId: string;
  source: AnalyticsSourceStamp;
  occurredAt: string;
}

/**
 * Maps one canonical completed source type into an analytics fact.
 * Implementations are read-only: they must use only the saved source data.
 */
export interface AnalyticsSourceAdapter<TSource> {
  /**
   * Categories this adapter may publish. Most native adapters publish one category;
   * Activity Results will publish all supported categories from one canonical source kind.
   */
  readonly sourceTypes: readonly [AnalyticsSourceType, ...AnalyticsSourceType[]];

  findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<TSource>>;

  describe(source: TSource): AnalyticsSourceDescriptor;

  buildFact(source: TSource): AnalyticsFactDocument;
}
