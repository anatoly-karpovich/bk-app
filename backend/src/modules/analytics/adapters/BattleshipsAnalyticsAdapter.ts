import type { WithId } from "mongodb";
import { BattleshipsRepository, type BattleshipsGameDocument } from "../../battleships/BattleshipsRepository";
import { aggregateAnalyticsResourceAmounts } from "../domain/rewardAggregation";
import type { AnalyticsFactDocument } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type BattleshipsAnalyticsSource = WithId<BattleshipsGameDocument>;
type Now = () => string;

/** Builds analytics facts from saved Battleships reward grants without rerolling pools. */
export class BattleshipsAnalyticsAdapter implements AnalyticsSourceAdapter<BattleshipsAnalyticsSource> {
  readonly sourceTypes = ["battleships"] as const;

  constructor(
    private readonly battleshipsRepository: BattleshipsRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<BattleshipsAnalyticsSource>> {
    return this.battleshipsRepository.findFinishedByProjectId(projectId);
  }

  describe(source: BattleshipsAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      occurredAt: source.finishedAt ?? source.updatedAt,
      source: {
        kind: "game",
        type: this.sourceTypes[0],
        id: source._id.toHexString(),
        titleSnapshot: "Морской бой",
        revision: null,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: BattleshipsAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    const regularRewards = aggregateAnalyticsResourceAmounts(
      source.shots.flatMap((shot) => shot.rewardGrants.map((grant) => grant.rewards)),
    );
    const missingPlayerReference = !source.playerRefId;

    return {
      projectId: descriptor.projectId,
      occurredAt: descriptor.occurredAt,
      source: descriptor.source,
      participants: [
        {
          playerRefId: source.playerRefId ?? null,
          nicknameSnapshot: source.playerName,
          rewards: {
            regular: regularRewards,
            bonus: [],
          },
        },
      ],
      resourceSnapshot: source.resources.map((resource) => ({ ...resource })),
      meta: {
        status: missingPlayerReference ? "partial" : "ready",
        issues: missingPlayerReference
          ? [{ code: "missing_player_reference", nicknameSnapshot: source.playerName }]
          : [],
        computedAt: this.now(),
        schemaVersion: 2,
      },
    };
  }
}
