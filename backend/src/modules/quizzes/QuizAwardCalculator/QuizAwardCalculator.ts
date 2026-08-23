import type { ResourceAmount } from "../../rewards";
import type { QuizAward, QuizEventQuestion, QuizSnapshot } from "../domain/types";
import type { RankedQuizAnswer } from "../QuizAnswerRanker/QuizAnswerRanker";

/** Builds deterministic persisted awards from an already-ranked reviewed result. */
export class QuizAwardCalculator {
  calculate(
    snapshot: QuizSnapshot,
    question: QuizEventQuestion,
    ranking: RankedQuizAnswer[],
    awardedAt: string,
    priorBonusRecipients: ReadonlySet<string> = new Set(),
  ): QuizAward[] {
    const regularRule =
      snapshot.configRulesSnapshot.regularRewardOverrides.find(
        (override) => override.questionIndex === question.questionIndex,
      )?.rule ?? snapshot.configRulesSnapshot.defaultRegularRule;
    const bonusRules =
      question.conductedOrder === null
        ? []
        : snapshot.configRulesSnapshot.bonusRules.filter((rule) => rule.questionIndex === question.conductedOrder);

    const awards = ranking.flatMap((answer) => {
      const answerAwards: QuizAward[] = [];
      if (regularRule.mode === "all_accepted") {
        answerAwards.push(
          this.createAward(
            question,
            answer,
            "regular_all",
            regularRule.rewardPool.rewards,
            awardedAt,
            regularRule.mode,
          ),
        );
      } else {
        const positionRule = regularRule.positionRewards.find((rule) => rule.position === answer.position);
        if (positionRule) {
          answerAwards.push(
            this.createAward(
              question,
              answer,
              "regular_position",
              positionRule.rewardPool.rewards,
              awardedAt,
              regularRule.mode,
            ),
          );
        }
      }
      if (!snapshot.configRulesSnapshot.limitOneBonusPerPlayer) {
        for (const rule of bonusRules) {
          if (rule.position !== answer.position) continue;
          answerAwards.push(
            this.createAward(
              question,
              answer,
              "bonus_position",
              rule.rewardPool.rewards,
              awardedAt,
              null,
              rule.id,
              rule.position,
            ),
          );
        }
      }
      return answerAwards;
    });

    if (!snapshot.configRulesSnapshot.limitOneBonusPerPlayer) return awards;

    const awardedPlayers = new Set(priorBonusRecipients);
    for (const rule of [...bonusRules].sort((left, right) => left.position - right.position)) {
      const recipient = this.findBonusRecipient(ranking, rule.position, awardedPlayers);
      if (!recipient) continue;
      awards.push(
        this.createAward(
          question,
          recipient,
          "bonus_position",
          rule.rewardPool.rewards,
          awardedAt,
          null,
          rule.id,
          rule.position,
        ),
      );
      awardedPlayers.add(this.playerKey(recipient));
    }
    return awards;
  }

  private findBonusRecipient(
    ranking: RankedQuizAnswer[],
    configuredPosition: number,
    awardedPlayers: ReadonlySet<string>,
  ): RankedQuizAnswer | null {
    const afterConfiguredPosition = ranking
      .slice(configuredPosition - 1)
      .find((answer) => !awardedPlayers.has(this.playerKey(answer)));
    return (
      afterConfiguredPosition ??
      [...ranking.slice(0, configuredPosition - 1)]
        .reverse()
        .find((answer) => !awardedPlayers.has(this.playerKey(answer))) ??
      null
    );
  }

  private createAward(
    question: QuizEventQuestion,
    answer: RankedQuizAnswer,
    kind: QuizAward["source"]["kind"],
    rewards: ResourceAmount[],
    awardedAt: string,
    regularRuleMode: QuizAward["source"]["regularRuleMode"],
    bonusRuleId: string | null = null,
    bonusRulePosition: number | null = null,
  ): QuizAward {
    if (question.conductedOrder === null) {
      throw new Error("Quiz awards can only be created for conducted questions");
    }
    const source = {
      kind,
      questionIndex: question.questionIndex,
      conductedOrder: question.conductedOrder,
      position: kind === "regular_all" ? null : answer.position,
      regularRuleMode,
      bonusRuleId,
      bonusRulePosition,
    } as const;
    return {
      id: [question.id, answer.selectedMessageId, kind, source.position ?? "all", bonusRuleId ?? "regular"].join(":"),
      selectedMessageId: answer.selectedMessageId,
      playerName: answer.playerName,
      playerRefId: answer.playerRefId,
      questionIndex: question.questionIndex,
      source,
      rewards: structuredClone(rewards),
      awardedAt,
    };
  }

  private playerKey(answer: Pick<RankedQuizAnswer, "playerName" | "playerRefId">): string {
    return answer.playerRefId ?? answer.playerName;
  }
}
