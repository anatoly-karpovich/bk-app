import type { WithId } from "mongodb";
import { ActivitiesRepository } from "../../activities/ActivitiesRepository";
import type { ActivityResultDocument } from "../../activities/domain/types";
import { ANALYTICS_ACTIVITY_SOURCE_TYPES } from "../domain/sourceTypes";
import { resolveAnalyticsOccurrenceDate } from "../domain/occurrenceDate";
import type { AnalyticsFactDocument } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type ActivityAnalyticsSource = WithId<ActivityResultDocument>;
type Now = () => string;

/** Projects saved manual Activity Result awards into Analytics without recalculation. */
export class ActivityResultAnalyticsAdapter implements AnalyticsSourceAdapter<ActivityAnalyticsSource> {
  readonly sourceTypes = ANALYTICS_ACTIVITY_SOURCE_TYPES;

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<ActivityAnalyticsSource>> {
    return this.activitiesRepository.findByProjectId(projectId);
  }

  describe(source: ActivityAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      ...resolveAnalyticsOccurrenceDate(source.conductedOn, source.createdAt),
      source: {
        kind: "activity",
        type: source.type,
        id: source._id.toHexString(),
        titleSnapshot: source.title,
        revision: source.revision,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: ActivityAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    return {
      projectId: descriptor.projectId,
      occurredOn: descriptor.occurredOn,
      occurrenceDateSource: descriptor.occurrenceDateSource,
      source: descriptor.source,
      participants: source.participants.map((participant) => ({
        playerRefId: participant.playerRefId,
        nicknameSnapshot: participant.nicknameSnapshot,
        rewards: structuredClone(participant.rewards),
      })),
      resourceSnapshot: structuredClone(source.resourceSnapshot),
      meta: {
        status: "ready",
        issues: [],
        computedAt: this.now(),
        schemaVersion: 3,
      },
    };
  }
}
