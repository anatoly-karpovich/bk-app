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
  ): QuizAward[] {
    const regularRule =
      snapshot.configRulesSnapshot.regularRewardOverrides.find(
        (override) => override.questionIndex === question.questionIndex,
      )?.rule ?? snapshot.configRulesSnapshot.defaultRegularRule;
    const bonusRules = question.conductedOrder === null
      ? []
      : snapshot.configRulesSnapshot.bonusRules.filter((rule) => rule.questionIndex === question.conductedOrder);

    return ranking.flatMap((answer) => {
      const awards: QuizAward[] = [];
      if (regularRule.mode === "all_accepted") {
        awards.push(this.createAward(question, answer, "regular_all", regularRule.rewardPool.rewards, awardedAt, regularRule.mode));
      } else {
        const positionRule = regularRule.positionRewards.find((rule) => rule.position === answer.position);
        if (positionRule) {
          awards.push(this.createAward(question, answer, "regular_position", positionRule.rewardPool.rewards, awardedAt, regularRule.mode));
        }
      }
      for (const rule of bonusRules) {
        if (rule.position !== answer.position) continue;
        awards.push(this.createAward(question, answer, "bonus_position", rule.rewardPool.rewards, awardedAt, null, rule.id));
      }
      return awards;
    });
  }

  private createAward(
    question: QuizEventQuestion,
    answer: RankedQuizAnswer,
    kind: QuizAward["source"]["kind"],
    rewards: ResourceAmount[],
    awardedAt: string,
    regularRuleMode: QuizAward["source"]["regularRuleMode"],
    bonusRuleId: string | null = null,
  ): QuizAward {
    const source = {
      kind,
      questionIndex: question.questionIndex,
      conductedOrder: kind === "bonus_position" ? question.conductedOrder : null,
      position: kind === "regular_all" ? null : answer.position,
      regularRuleMode,
      bonusRuleId,
    } as const;
    return {
      id: [question.id, answer.selectedMessageId, kind, source.position ?? "all", bonusRuleId ?? "regular"].join(":"),
      selectedMessageId: answer.selectedMessageId,
      playerName: answer.playerName,
      questionIndex: question.questionIndex,
      source,
      rewards: structuredClone(rewards),
      awardedAt,
    };
  }
}
