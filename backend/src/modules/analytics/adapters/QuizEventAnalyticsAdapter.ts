import type { WithId } from "mongodb";
import { QuizEventsRepository } from "../../quizzes/QuizEventsRepository";
import type { QuizAward, QuizEventDocument } from "../../quizzes/domain/types";
import type { ResourceAmount } from "../../rewards";
import { aggregateAnalyticsResourceAmounts } from "../domain/rewardAggregation";
import type { AnalyticsFactDocument, AnalyticsParticipantResult } from "../domain/types";
import type { AnalyticsSourceAdapter, AnalyticsSourceDescriptor } from "./AnalyticsSourceAdapter";

type QuizEventAnalyticsSource = WithId<QuizEventDocument>;
type Now = () => string;

interface QuizParticipantAccumulator {
  playerRefId: string | null;
  nicknameSnapshot: string;
  regularRewardGroups: ResourceAmount[][];
  bonusRewardGroups: ResourceAmount[][];
}

/** Builds analytics facts from saved Quiz Event awards without recalculating results. */
export class QuizEventAnalyticsAdapter implements AnalyticsSourceAdapter<QuizEventAnalyticsSource> {
  readonly sourceType = "quiz" as const;

  constructor(
    private readonly quizEventsRepository: QuizEventsRepository,
    private readonly now: Now = () => new Date().toISOString(),
  ) {}

  async findFinishedByProjectId(projectId: string): Promise<ReadonlyArray<QuizEventAnalyticsSource>> {
    return this.quizEventsRepository.findCompletedByProjectId(projectId);
  }

  describe(source: QuizEventAnalyticsSource): AnalyticsSourceDescriptor {
    return {
      projectId: source.projectId,
      occurredAt: source.completedAt ?? source.updatedAt,
      source: {
        kind: "quiz_event",
        type: this.sourceType,
        id: source._id.toHexString(),
        quizId: source.quizId,
        revision: source.revision,
        updatedAt: source.updatedAt,
      },
    };
  }

  buildFact(source: QuizEventAnalyticsSource): AnalyticsFactDocument {
    const descriptor = this.describe(source);
    const participants = this.collectParticipants(source);
    const issues = participants
      .filter((participant) => participant.playerRefId === null)
      .map((participant) => ({
        code: "missing_player_reference" as const,
        nicknameSnapshot: participant.nicknameSnapshot,
      }));

    return {
      projectId: descriptor.projectId,
      occurredAt: descriptor.occurredAt,
      source: descriptor.source,
      participants: participants.map((participant) => this.toParticipant(participant)),
      resourceSnapshot: source.quizSnapshot.resources.map((resource) => ({ ...resource })),
      meta: {
        status: issues.length > 0 ? "partial" : "ready",
        issues,
        computedAt: this.now(),
        schemaVersion: 1,
      },
    };
  }

  private collectParticipants(source: QuizEventAnalyticsSource): QuizParticipantAccumulator[] {
    const resolvedParticipants = new Map<string, QuizParticipantAccumulator>();
    const unresolvedParticipants: QuizParticipantAccumulator[] = [];

    for (const question of source.questions) {
      for (const award of question.awards) {
        const playerRefId = award.playerRefId ?? null;
        const participant = playerRefId
          ? resolvedParticipants.get(playerRefId) ?? this.createParticipant(playerRefId, award.playerName)
          : this.createParticipant(null, award.playerName);

        this.addAward(participant, award);

        if (playerRefId) resolvedParticipants.set(playerRefId, participant);
        else unresolvedParticipants.push(participant);
      }
    }

    return [...resolvedParticipants.values(), ...unresolvedParticipants];
  }

  private createParticipant(playerRefId: string | null, nicknameSnapshot: string): QuizParticipantAccumulator {
    return { playerRefId, nicknameSnapshot, regularRewardGroups: [], bonusRewardGroups: [] };
  }

  private addAward(participant: QuizParticipantAccumulator, award: QuizAward): void {
    if (award.source.kind === "bonus_position") participant.bonusRewardGroups.push(award.rewards);
    else participant.regularRewardGroups.push(award.rewards);
  }

  private toParticipant(participant: QuizParticipantAccumulator): AnalyticsParticipantResult {
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
