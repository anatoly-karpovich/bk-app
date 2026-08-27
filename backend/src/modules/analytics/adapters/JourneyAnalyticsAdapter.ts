import type { WithId } from "mongodb";
import { JourneyRepository, type JourneyGameDocument } from "../../journey/JourneyRepository";
import type { ResourceAmount } from "../../rewards";
import { aggregateAnalyticsResourceAmounts } from "../domain/rewardAggregation";
import { resolveAnalyticsOccurrenceDate } from "../domain/occurrenceDate";
import type { AnalyticsFactDocument, AnalyticsParticipantResult } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type JourneyAnalyticsSource = WithId<JourneyGameDocument>;
type Now = () => string;

interface JourneyParticipantAccumulator {
  playerRefId: string | null;
  nicknameSnapshot: string;
  sourcePlayerId?: string;
  regularRewardGroups: ResourceAmount[][];
  bonusRewardGroups: ResourceAmount[][];
}

/** Builds analytics facts from Journey's immutable final player reward snapshots. */
export class JourneyAnalyticsAdapter implements AnalyticsSourceAdapter<JourneyAnalyticsSource> {
  readonly sourceTypes = ["journey"] as const;

  constructor(
    private readonly journeyRepository: JourneyRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<JourneyAnalyticsSource>> {
    return this.journeyRepository.findFinishedByProjectId(projectId);
  }

  describe(source: JourneyAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      ...resolveAnalyticsOccurrenceDate(source.conductedOn, source.finishedAt ?? source.updatedAt),
      source: {
        kind: "game",
        type: this.sourceTypes[0],
        id: source._id.toHexString(),
        titleSnapshot: "Карта Мародёров",
        revision: null,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: JourneyAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    const participantAccumulators = this.collectParticipants(source);
    const participants = Array.from(participantAccumulators.values()).map((participant) => this.toParticipant(participant));
    const issues = Array.from(participantAccumulators.values())
      .filter((participant) => participant.playerRefId === null)
      .map((participant) => ({
        code: "missing_player_reference" as const,
        sourcePlayerId: participant.sourcePlayerId,
        nicknameSnapshot: participant.nicknameSnapshot,
      }));

    return {
      projectId: descriptor.projectId,
      occurredOn: descriptor.occurredOn,
      occurrenceDateSource: descriptor.occurrenceDateSource,
      source: descriptor.source,
      participants,
      resourceSnapshot: source.resources.map((resource) => ({ ...resource })),
      meta: {
        status: issues.length > 0 ? "partial" : "ready",
        issues,
        computedAt: this.now(),
        schemaVersion: 3,
      },
    };
  }

  private collectParticipants(source: JourneyAnalyticsSource): Map<string, JourneyParticipantAccumulator> {
    const participants = new Map<string, JourneyParticipantAccumulator>();

    for (const player of source.stateV2.players) {
      if (player.status !== "finished") continue;
      if (!player.finalRewards) {
        throw new Error(`Finished Journey player ${player.id} is missing final rewards`);
      }

      const playerRefId = player.playerRefId ?? null;
      const key = playerRefId ? `resolved:${playerRefId}` : `unresolved:${player.id}`;
      const participant = participants.get(key) ?? {
        playerRefId,
        nicknameSnapshot: player.nickname,
        sourcePlayerId: playerRefId ? undefined : player.id,
        regularRewardGroups: [],
        bonusRewardGroups: [],
      };

      participant.regularRewardGroups.push(player.finalRewards.regular);
      participant.bonusRewardGroups.push(player.finalRewards.bonus);
      participants.set(key, participant);
    }

    return participants;
  }

  private toParticipant(participant: JourneyParticipantAccumulator): AnalyticsParticipantResult {
    return {
      playerRefId: participant.playerRefId,
      nicknameSnapshot: participant.nicknameSnapshot,
      rewards: {
        regular: aggregateAnalyticsResourceAmounts(participant.regularRewardGroups),
        bonus: aggregateAnalyticsResourceAmounts(participant.bonusRewardGroups),
      },
    };
  }
}
