import type { WithId } from "mongodb";
import type { ActivityResultDocument } from "../activities/domain/types";
import type { BattleshipsGameDocument } from "../battleships/BattleshipsRepository";
import type { JourneyGameDocument } from "../journey/JourneyRepository";
import type { LottoGameDocument } from "../lotto/LottoRepository";
import type { LottoBingoGameDocument } from "../lottoBingo/LottoBingoRepository";
import type { QuizEventDocument } from "../quizzes/domain/types";
import { BattleshipsAnalyticsAdapter } from "./adapters/BattleshipsAnalyticsAdapter";
import { JourneyAnalyticsAdapter } from "./adapters/JourneyAnalyticsAdapter";
import { LottoAnalyticsAdapter } from "./adapters/LottoAnalyticsAdapter";
import { LottoBingoAnalyticsAdapter } from "./adapters/LottoBingoAnalyticsAdapter";
import { QuizEventAnalyticsAdapter } from "./adapters/QuizEventAnalyticsAdapter";
import { ActivityResultAnalyticsAdapter } from "./adapters/ActivityResultAnalyticsAdapter";
import type { AnalyticsSourceAdapter } from "./adapters/AnalyticsSourceAdapter";
import { AnalyticsProjectionService } from "./AnalyticsProjectionService";

export interface AnalyticsProjectionSubmitter {
  submitActivityResult(source: WithId<ActivityResultDocument>): Promise<void>;
  submitJourneyGame(source: WithId<JourneyGameDocument>): Promise<void>;
  submitBattleshipsGame(source: WithId<BattleshipsGameDocument>): Promise<void>;
  submitLottoGame(source: WithId<LottoGameDocument>): Promise<void>;
  submitLottoBingoGame(source: WithId<LottoBingoGameDocument>): Promise<void>;
  submitQuizEvent(source: WithId<QuizEventDocument>): Promise<void>;
}

export interface AnalyticsSubmissionLogger {
  error(message: string, context: Record<string, unknown>): void;
}

const defaultLogger: AnalyticsSubmissionLogger = {
  error(message, context) {
    console.error(message, context);
  },
};

/**
 * Best-effort projection update for one source that has just been saved in a final state.
 * Canonical source persistence has already succeeded when this class is called.
 */
export class BestEffortAnalyticsProjectionSubmitter implements AnalyticsProjectionSubmitter {
  constructor(
    private readonly projectionService: AnalyticsProjectionService,
    private readonly adapters: {
      activityResult: ActivityResultAnalyticsAdapter;
      journey: JourneyAnalyticsAdapter;
      battleships: BattleshipsAnalyticsAdapter;
      lotto: LottoAnalyticsAdapter;
      lottoBingo: LottoBingoAnalyticsAdapter;
      quizEvent: QuizEventAnalyticsAdapter;
    },
    private readonly logger: AnalyticsSubmissionLogger = defaultLogger,
  ) {}

  async submitActivityResult(source: WithId<ActivityResultDocument>): Promise<void> {
    await this.submit("submit_activity_result_fact", this.adapters.activityResult, source);
  }

  async submitJourneyGame(source: WithId<JourneyGameDocument>): Promise<void> {
    await this.submit("submit_journey_fact", this.adapters.journey, source);
  }

  async submitBattleshipsGame(source: WithId<BattleshipsGameDocument>): Promise<void> {
    await this.submit("submit_battleships_fact", this.adapters.battleships, source);
  }

  async submitLottoGame(source: WithId<LottoGameDocument>): Promise<void> {
    await this.submit("submit_lotto_fact", this.adapters.lotto, source);
  }

  async submitLottoBingoGame(source: WithId<LottoBingoGameDocument>): Promise<void> {
    await this.submit("submit_lotto_bingo_fact", this.adapters.lottoBingo, source);
  }

  async submitQuizEvent(source: WithId<QuizEventDocument>): Promise<void> {
    await this.submit("submit_quiz_event_fact", this.adapters.quizEvent, source);
  }

  private async submit<TSource>(
    operation: string,
    adapter: AnalyticsSourceAdapter<TSource>,
    source: TSource,
  ): Promise<void> {
    let context: Record<string, unknown> = { operation, sourceTypes: adapter.sourceTypes };
    try {
      const descriptor = adapter.describe(source);
      context = {
        ...context,
        projectId: descriptor.projectId,
        sourceKind: descriptor.source.kind,
        sourceId: descriptor.source.id,
      };
      await this.projectionService.submitSource(adapter, source);
    } catch (error) {
      this.logger.error("Analytics source fact submission failed", { ...context, error });
    }
  }
}
