import { addResourceAmounts } from "../../rewards";
import { toPlayerNicknameKey } from "../../players/domain/normalizePlayerNickname";
import type { QuizEventQuestion, QuizEventSummary } from "../domain/types";

/** Aggregates persisted reviewed outcomes. It never ranks answers or creates awards. */
export class QuizEventSummaryCalculator {
  calculate(questions: QuizEventQuestion[], generatedAt = new Date().toISOString()): QuizEventSummary {
    const reviewedQuestions = questions.filter(
      (question) => question.conductedOrder !== null && question.reviewedAt !== null,
    );
    const players = new Map<
      string,
      {
        playerName: string;
        playerRefId?: string;
        correctAnswers: number;
        regularRewards: import("../../rewards").ResourceAmount[];
        bonusRewards: import("../../rewards").ResourceAmount[];
      }
    >();

    for (const question of reviewedQuestions) {
      for (const selection of question.selectedAnswers) {
        const key = selection.playerRefId ?? `legacy:${toPlayerNicknameKey(selection.playerName)}`;
        const entry = players.get(key) ?? {
          playerName: selection.playerName,
          playerRefId: selection.playerRefId,
          correctAnswers: 0,
          regularRewards: [],
          bonusRewards: [],
        };
        entry.correctAnswers += 1;
        for (const award of question.awards.filter(
          (candidate) => candidate.selectedMessageId === selection.selectedMessageId,
        )) {
          if (award.source.kind === "bonus_position") entry.bonusRewards.push(...award.rewards);
          else entry.regularRewards.push(...award.rewards);
        }
        players.set(key, entry);
      }
    }

    const playerSummaries = [...players.entries()]
      .map(([, entry]) => ({
        playerName: entry.playerName,
        playerRefId: entry.playerRefId,
        correctAnswers: entry.correctAnswers,
        regularRewards: addResourceAmounts(entry.regularRewards),
        bonusRewards: addResourceAmounts(entry.bonusRewards),
        totalRewards: addResourceAmounts([...entry.regularRewards, ...entry.bonusRewards]),
      }))
      .sort((left, right) => left.playerName.localeCompare(right.playerName, "ru"));

    return {
      players: playerSummaries,
      totalPreparedQuestions: questions.length,
      totalConductedQuestions: questions.filter((question) => question.conductedOrder !== null).length,
      totalReviewedQuestions: reviewedQuestions.length,
      totalSelectedAnswers: reviewedQuestions.reduce((total, question) => total + question.selectedAnswers.length, 0),
      totalUniquePlayers: playerSummaries.length,
      totalRewards: addResourceAmounts(playerSummaries.flatMap((player) => player.totalRewards)),
      generatedAt,
    };
  }
}
