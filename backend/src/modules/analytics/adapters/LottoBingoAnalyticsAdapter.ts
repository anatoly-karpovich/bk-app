import type { WithId } from "mongodb";
import { LottoBingoRepository, type LottoBingoGameDocument } from "../../lottoBingo/LottoBingoRepository";
import type { LottoBingoPayoutCategory } from "../../lottoBingo/domain/types";
import type { ResourceAmount } from "../../rewards";
import { aggregateAnalyticsResourceAmounts } from "../domain/rewardAggregation";
import type { AnalyticsFactDocument, AnalyticsParticipantResult } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type LottoBingoAnalyticsSource = WithId<LottoBingoGameDocument>;
type Now = () => string;

interface LottoBingoParticipantAccumulator {
  playerRefId: string | null;
  nicknameSnapshot: string;
  sourcePlayerId?: string;
  regularRewardGroups: ResourceAmount[][];
  bonusRewardGroups: ResourceAmount[][];
}

interface LottoBingoPayoutGroups {
  regular: ResourceAmount[][];
  bonus: ResourceAmount[][];
}

/** Builds analytics facts from saved Lotto Bingo payouts without recalculating rewards. */
export class LottoBingoAnalyticsAdapter implements AnalyticsSourceAdapter<LottoBingoAnalyticsSource> {
  readonly sourceType = "lotto_bingo" as const;

  constructor(
    private readonly lottoBingoRepository: LottoBingoRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<LottoBingoAnalyticsSource>> {
    return this.lottoBingoRepository.findFinishedByProjectId(projectId);
  }

  describe(source: LottoBingoAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      occurredAt: source.finishedAt ?? source.updatedAt,
      source: {
        kind: "game",
        type: this.sourceType,
        id: source._id.toHexString(),
        titleSnapshot: "Лото Бинго",
        revision: source.revision,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: LottoBingoAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    const payoutGroupsByPlayerId = this.collectPayoutGroups(source);
    const participantAccumulators = this.collectParticipants(source, payoutGroupsByPlayerId);
    const participantValues = Array.from(participantAccumulators.values());
    const issues = participantValues
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
      participants: participantValues.map((participant) => this.toParticipant(participant)),
      resourceSnapshot: source.resources.map((resource) => ({ ...resource })),
      meta: {
        status: issues.length > 0 ? "partial" : "ready",
        issues,
        computedAt: this.now(),
        schemaVersion: 2,
      },
    };
  }

  private collectPayoutGroups(source: LottoBingoAnalyticsSource): Map<string, LottoBingoPayoutGroups> {
    const payoutGroupsByPlayerId = new Map<string, LottoBingoPayoutGroups>();

    for (const payout of source.payouts) {
      const groups = payoutGroupsByPlayerId.get(payout.playerId) ?? { regular: [], bonus: [] };
      groups[this.rewardCategoryForPayout(payout.category)].push(payout.resolvedRewards);
      payoutGroupsByPlayerId.set(payout.playerId, groups);
    }

    return payoutGroupsByPlayerId;
  }

  private collectParticipants(
    source: LottoBingoAnalyticsSource,
    payoutGroupsByPlayerId: ReadonlyMap<string, LottoBingoPayoutGroups>,
  ): Map<string, LottoBingoParticipantAccumulator> {
    const participants = new Map<string, LottoBingoParticipantAccumulator>();

    for (const player of source.players) {
      if (player.status === "disqualified") continue;

      const playerRefId = player.playerRefId ?? null;
      const key = playerRefId ? `resolved:${playerRefId}` : `unresolved:${player.id}`;
      const participant = participants.get(key) ?? {
        playerRefId,
        nicknameSnapshot: player.nickname,
        sourcePlayerId: playerRefId ? undefined : player.id,
        regularRewardGroups: [],
        bonusRewardGroups: [],
      };
      const payoutGroups = payoutGroupsByPlayerId.get(player.id);

      if (payoutGroups) {
        participant.regularRewardGroups.push(...payoutGroups.regular);
        participant.bonusRewardGroups.push(...payoutGroups.bonus);
      }
      participants.set(key, participant);
    }

    return participants;
  }

  private toParticipant(participant: LottoBingoParticipantAccumulator): AnalyticsParticipantResult {
    return {
      playerRefId: participant.playerRefId,
      nicknameSnapshot: participant.nicknameSnapshot,
      rewards: {
        regular: aggregateAnalyticsResourceAmounts(participant.regularRewardGroups),
        bonus: aggregateAnalyticsResourceAmounts(participant.bonusRewardGroups),
      },
    };
  }

  private rewardCategoryForPayout(category: LottoBingoPayoutCategory): keyof LottoBingoPayoutGroups {
    return category === "round1" || category === "round2" || category === "round3" ? "bonus" : "regular";
  }
}
