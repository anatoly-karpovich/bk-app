import type { WithId } from "mongodb";
import { LottoRepository, type LottoGameDocument } from "../../lotto/LottoRepository";
import type { ResourceAmount } from "../../rewards";
import { aggregateAnalyticsResourceAmounts } from "../domain/rewardAggregation";
import type { AnalyticsFactDocument, AnalyticsParticipantResult } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type LottoAnalyticsSource = WithId<LottoGameDocument>;
type Now = () => string;

interface LottoParticipantAccumulator {
  playerRefId: string | null;
  nicknameSnapshot: string;
  sourcePlayerId?: string;
  regularRewardGroups: ResourceAmount[][];
}

/** Builds analytics facts from saved Lotto payouts without recalculating their distribution. */
export class LottoAnalyticsAdapter implements AnalyticsSourceAdapter<LottoAnalyticsSource> {
  readonly sourceType = "lotto" as const;

  constructor(
    private readonly lottoRepository: LottoRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<LottoAnalyticsSource>> {
    return this.lottoRepository.findFinishedByProjectId(projectId);
  }

  describe(source: LottoAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      occurredAt: source.finishedAt ?? source.updatedAt,
      source: {
        kind: "game",
        type: this.sourceType,
        id: source._id.toHexString(),
        titleSnapshot: "Лото",
        revision: null,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: LottoAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    const payoutRewardsByPlayerId = this.collectPayoutRewards(source);
    const participantAccumulators = this.collectParticipants(source, payoutRewardsByPlayerId);
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
      occurredAt: descriptor.occurredAt,
      source: descriptor.source,
      participants,
      resourceSnapshot: source.resources.map((resource) => ({ ...resource })),
      meta: {
        status: issues.length > 0 ? "partial" : "ready",
        issues,
        computedAt: this.now(),
        schemaVersion: 2,
      },
    };
  }

  private collectPayoutRewards(source: LottoAnalyticsSource): Map<string, ResourceAmount[][]> {
    const rewardsByPlayerId = new Map<string, ResourceAmount[][]>();

    for (const payout of source.payouts) {
      const playerPayouts = rewardsByPlayerId.get(payout.playerId) ?? [];
      playerPayouts.push(payout.awardedRewards);
      rewardsByPlayerId.set(payout.playerId, playerPayouts);
    }

    return rewardsByPlayerId;
  }

  private collectParticipants(
    source: LottoAnalyticsSource,
    payoutRewardsByPlayerId: ReadonlyMap<string, ResourceAmount[][]>,
  ): Map<string, LottoParticipantAccumulator> {
    const participants = new Map<string, LottoParticipantAccumulator>();

    for (const player of source.players) {
      if (player.status === "removed") continue;

      const playerRefId = player.playerRefId ?? null;
      const key = playerRefId ? `resolved:${playerRefId}` : `unresolved:${player.id}`;
      const participant = participants.get(key) ?? {
        playerRefId,
        nicknameSnapshot: player.nickname,
        sourcePlayerId: playerRefId ? undefined : player.id,
        regularRewardGroups: [],
      };

      participant.regularRewardGroups.push(...(payoutRewardsByPlayerId.get(player.id) ?? []));
      participants.set(key, participant);
    }

    return participants;
  }

  private toParticipant(participant: LottoParticipantAccumulator): AnalyticsParticipantResult {
    return {
      playerRefId: participant.playerRefId,
      nicknameSnapshot: participant.nicknameSnapshot,
      rewards: {
        regular: aggregateAnalyticsResourceAmounts(participant.regularRewardGroups),
        bonus: [],
      },
    };
  }
}
