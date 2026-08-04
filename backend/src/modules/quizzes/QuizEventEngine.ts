import { randomUUID } from "node:crypto";
import { RewardGrantService, addResourceAmounts } from "../rewards";
import { buildQuizMessage } from "./domain/messageBuilder";
import type {
  QuizAnswer, QuizAnswerStatus, QuizAward, QuizEventDocument, QuizEventQuestion, QuizEventSummary, QuizMessageKind, QuizQuestion, QuizSnapshot,
} from "./domain/types";

export class QuizEventEngine {
  constructor(private readonly rewardGrantService: RewardGrantService) {}

  create(snapshot: QuizSnapshot, host: QuizEventDocument["hostSnapshot"], name: string): QuizEventDocument {
    const now = new Date().toISOString();
    return {
      projectId: "", quizId: snapshot.quizId, quizSnapshot: structuredClone(snapshot), name, hostUserId: host.userId, hostSnapshot: structuredClone(host), status: "draft", currentQuestionId: null,
      questions: snapshot.questions.map((question) => this.createQuestion(question, now)), summary: null, startedAt: null, completedAt: null, createdAt: now, updatedAt: now, schemaVersion: 1,
    };
  }

  start(event: QuizEventDocument): QuizEventDocument { this.assertStatus(event, "draft"); const now = new Date().toISOString(); return { ...event, status: "active", startedAt: now, updatedAt: now }; }
  pause(event: QuizEventDocument): QuizEventDocument { this.assertStatus(event, "active"); return { ...event, status: "paused", updatedAt: new Date().toISOString() }; }
  resume(event: QuizEventDocument): QuizEventDocument { this.assertStatus(event, "paused"); return { ...event, status: "active", updatedAt: new Date().toISOString() }; }
  cancel(event: QuizEventDocument): QuizEventDocument { if (event.status === "completed") throw new Error("Completed event cannot be cancelled"); return { ...event, status: "cancelled", currentQuestionId: null, updatedAt: new Date().toISOString() }; }

  completeEvent(event: QuizEventDocument): QuizEventDocument {
    if (!["active", "paused"].includes(event.status)) throw new Error("Only active or paused event can be completed");
    if (event.currentQuestionId || event.questions.some((question) => !["completed", "skipped"].includes(question.status))) throw new Error("Все вопросы должны быть завершены или пропущены");
    const now = new Date().toISOString();
    return { ...event, status: "completed", completedAt: now, summary: this.buildSummary(event, now), updatedAt: now };
  }

  startQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId) throw new Error("Уже есть активный вопрос");
    const target = this.findQuestion(event, questionId);
    if (target.status !== "pending") throw new Error("Начать можно только pending-вопрос");
    const questions = this.reindexForStartedQuestion(event.questions, questionId).map((question) => question.id === questionId ? { ...question, status: "active" as const, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : question);
    return { ...event, questions, currentQuestionId: questionId, updatedAt: new Date().toISOString() };
  }

  completeQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId !== questionId) throw new Error("Этот вопрос не активен");
    const now = new Date().toISOString();
    const questions = event.questions.map((question) => {
      if (question.id !== questionId) return question;
      const completed = { ...question, status: "completed" as const, completedAt: now, updatedAt: now };
      return { ...completed, awards: this.calculateAwards(event.quizSnapshot, completed, now) };
    });
    const next = { ...event, questions, currentQuestionId: null, updatedAt: now };
    const withSummary = { ...next, summary: this.buildSummary(next, now) };
    const nextQuestion = withSummary.questions.find((item) => item.status === "pending");
    return nextQuestion ? this.startQuestion(withSummary, nextQuestion.id) : withSummary;
  }

  skipQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    const question = this.findQuestion(event, questionId);
    if (question.status !== "pending") throw new Error("Пропустить можно только pending-вопрос");
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((item) => item.id === questionId ? { ...item, status: "skipped", updatedAt: now } : item), updatedAt: now };
  }

  restoreQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    const question = this.findQuestion(event, questionId);
    if (question.status !== "skipped") throw new Error("Восстановить можно только skipped-вопрос");
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((item) => item.id === questionId ? { ...item, status: "pending", updatedAt: now } : item), updatedAt: now };
  }

  reorder(event: QuizEventDocument, ids: string[]): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId) throw new Error("Нельзя менять порядок при активном вопросе");
    const movable = event.questions.filter((question) => question.status === "pending" || question.status === "skipped");
    if (ids.length !== movable.length || new Set(ids).size !== ids.length || ids.some((id) => !movable.some((question) => question.id === id))) throw new Error("Список перестановки должен содержать все pending/skipped-вопросы по одному разу");
    const byId = new Map(event.questions.map((question) => [question.id, question]));
    const orderedMovable = ids.map((id) => byId.get(id)!);
    const fixedIndexes = new Set(event.questions.filter((question) => question.status === "completed").map((question) => question.questionIndex));
    const slots = Array.from({ length: event.questions.length }, (_, index) => index + 1).filter((index) => !fixedIndexes.has(index));
    const now = new Date().toISOString();
    const nextById = new Map(orderedMovable.map((question, index) => [question.id, { ...question, questionIndex: slots[index], updatedAt: now }]));
    return { ...event, questions: event.questions.map((question) => nextById.get(question.id) ?? question).sort((a, b) => a.questionIndex - b.questionIndex), updatedAt: now };
  }

  setMessage(event: QuizEventDocument, questionId: string, kind: QuizMessageKind, text: string | null, actorId: string): QuizEventDocument {
    this.assertMutable(event);
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((question) => question.id !== questionId ? question : { ...question, message: kind === "question" ? { ...question.message, messageTextOverride: text, messageTextUpdatedAt: text === null ? null : now, messageTextUpdatedByUserId: text === null ? null : actorId } : { ...question.message, answerTextOverride: text, answerTextUpdatedAt: text === null ? null : now, answerTextUpdatedByUserId: text === null ? null : actorId }, updatedAt: now }), updatedAt: now };
  }

  appendAnswers(event: QuizEventDocument, questionId: string, input: { mode: "append" | "replace"; rawText: string; insertedByUserId: string; parsed: Array<Omit<QuizAnswer, "id" | "fragmentId" | "order" | "isActive" | "status" | "decidedAt" | "decidedByUserId">>; acceptedCanonicalKeys?: string[] }): QuizEventDocument {
    this.assertStatus(event, "active");
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((question) => {
      if (question.id !== questionId) return question;
      const fragmentId = randomUUID();
      const fragment = { id: fragmentId, rawText: input.rawText, mode: input.mode, isActive: true, insertedAt: now, insertedByUserId: input.insertedByUserId };
      const acceptedCanonicalKeys = input.acceptedCanonicalKeys ?? [];
      const acceptedKeys = new Set(acceptedCanonicalKeys);
      if (acceptedCanonicalKeys.some((key) => !input.parsed.some((line) => line.canonicalKey === key))) throw new Error("Подтверждённый ответ не найден в preview фрагмента");
      const existingKeys = new Set((input.mode === "replace" ? [] : question.answers.filter((answer) => answer.isActive !== false)).map((answer) => answer.canonicalKey));
      let order = Math.max(0, ...question.answers.map((answer) => answer.order));
      const importedLines = input.mode === "replace" ? input.parsed.filter((line) => acceptedKeys.has(line.canonicalKey)) : input.parsed;
      const importedAnswers = importedLines.filter((line) => !existingKeys.has(line.canonicalKey)).map((line) => ({ ...line, id: randomUUID(), fragmentId, order: ++order, isActive: true, status: input.mode === "replace" ? "accepted" as const : "pending" as const, decidedAt: input.mode === "replace" ? now : null, decidedByUserId: input.mode === "replace" ? input.insertedByUserId : null }));
      const priorAnswers = input.mode === "replace" ? question.answers.map((answer) => ({ ...answer, isActive: false })) : question.answers;
      return { ...question, chatFragments: [...question.chatFragments.map((fragment) => input.mode === "replace" ? { ...fragment, isActive: false } : fragment), fragment], answers: [...priorAnswers, ...importedAnswers], updatedAt: now };
    }), updatedAt: now };
  }

  changeAnswerStatus(event: QuizEventDocument, questionId: string, answerIds: string[], status: QuizAnswerStatus, actorId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    const question = this.findQuestion(event, questionId);
    if (!answerIds.length || answerIds.some((id) => !question.answers.some((answer) => answer.id === id))) throw new Error("Ответ не найден в вопросе");
    const now = new Date().toISOString();
    const questions = event.questions.map((item) => {
      if (item.id !== questionId) return item;
      const answers = item.answers.map((answer) => !answerIds.includes(answer.id) ? answer : { ...answer, status, decidedAt: status === "pending" ? null : now, decidedByUserId: status === "pending" ? null : actorId });
      const updated = { ...item, answers, updatedAt: now };
      return updated.status === "completed" ? { ...updated, awards: this.calculateAwards(event.quizSnapshot, updated, now) } : updated;
    });
    const next = { ...event, questions, updatedAt: now };
    return { ...next, summary: next.questions.some((item) => item.status === "completed") ? this.buildSummary(next, now) : next.summary };
  }

  buildSummary(event: QuizEventDocument, generatedAt = new Date().toISOString()): QuizEventSummary {
    const playerEntries = new Map<string, { correctAnswers: number; regularRewards: import("../rewards").ResourceAmount[]; bonusRewards: import("../rewards").ResourceAmount[] }>();
    let totalAcceptedAnswers = 0;
    let totalUniqueCorrectAnswers = 0;
    for (const question of event.questions) {
      totalAcceptedAnswers += question.answers.filter((answer) => answer.isActive !== false && answer.status === "accepted").length;
      const ranked = this.rankedAnswers(question);
      totalUniqueCorrectAnswers += ranked.length;
      for (const answer of ranked) {
        const entry = playerEntries.get(answer.playerName) ?? { correctAnswers: 0, regularRewards: [], bonusRewards: [] };
        entry.correctAnswers += 1;
        for (const award of question.awards.filter((candidate) => candidate.answerId === answer.id)) {
          if (award.source.kind === "bonus_position") entry.bonusRewards.push(...award.resolvedRewards); else entry.regularRewards.push(...award.resolvedRewards);
        }
        playerEntries.set(answer.playerName, entry);
      }
    }
    const players = [...playerEntries.entries()].map(([playerName, entry]) => ({ playerName, correctAnswers: entry.correctAnswers, regularRewards: addResourceAmounts(entry.regularRewards), bonusRewards: addResourceAmounts(entry.bonusRewards), totalRewards: addResourceAmounts([...entry.regularRewards, ...entry.bonusRewards]) })).sort((left, right) => left.playerName.localeCompare(right.playerName, "ru"));
    return { players, totalQuestions: event.questions.length, completedQuestions: event.questions.filter((question) => question.status === "completed").length, totalAcceptedAnswers, totalUniqueCorrectAnswers, totalRewards: addResourceAmounts(players.flatMap((player) => player.totalRewards)), generatedAt };
  }

  rankedAnswers(question: QuizEventQuestion): QuizAnswer[] {
    const seen = new Set<string>();
    return question.answers.filter((answer) => answer.isActive !== false && answer.status === "accepted").sort((left, right) => left.order - right.order).filter((answer) => !seen.has(answer.playerName) && (seen.add(answer.playerName), true));
  }

  private calculateAwards(snapshot: QuizSnapshot, question: QuizEventQuestion, now: string): QuizAward[] {
    const rule = snapshot.configRulesSnapshot.regularRewardOverrides.find((override) => override.questionIndex === question.questionIndex)?.rule ?? snapshot.configRulesSnapshot.defaultRegularRule;
    const bonuses = snapshot.configRulesSnapshot.bonusRules.filter((bonus) => bonus.questionIndex === question.questionIndex);
    return this.rankedAnswers(question).flatMap((answer, offset) => {
      const position = offset + 1;
      const awards: QuizAward[] = [];
      const create = (kind: QuizAward["source"]["kind"], pool: import("../rewards").AllRewardPool, bonusRuleId: string | null = null) => awards.push({ id: randomUUID(), answerId: answer.id, playerName: answer.playerName, questionIndex: question.questionIndex, source: { kind, questionIndex: question.questionIndex, position, regularRuleMode: kind === "bonus_position" ? null : rule.mode, bonusRuleId }, resolvedRewards: this.rewardGrantService.resolve(pool), awardedAt: now });
      if (rule.mode === "all_accepted") create("regular_all", rule.rewardPool);
      if (rule.mode === "by_position") { const positionRule = rule.positionRewards.find((entry) => entry.position === position); if (positionRule) create("regular_position", positionRule.rewardPool); }
      bonuses.filter((bonus) => bonus.position === position).forEach((bonus) => create("bonus_position", bonus.rewardPool, bonus.id));
      return awards;
    });
  }

  private createQuestion(question: QuizQuestion, now: string): QuizEventQuestion { return { id: randomUUID(), quizQuestionId: question.id, questionIndex: question.questionIndex, status: "pending", message: { messageTextOverride: null, messageTextUpdatedAt: null, messageTextUpdatedByUserId: null, answerTextOverride: null, answerTextUpdatedAt: null, answerTextUpdatedByUserId: null }, chatFragments: [], answers: [], awards: [], startedAt: null, completedAt: null, updatedAt: now }; }
  private reindexForStartedQuestion(questions: QuizEventQuestion[], startedId: string): QuizEventQuestion[] { const fixed = new Set(questions.filter((q) => q.status === "completed").map((q) => q.questionIndex)); const slots = Array.from({ length: questions.length }, (_, i) => i + 1).filter((i) => !fixed.has(i)); const selected = questions.find((q) => q.id === startedId)!; const rest = questions.filter((q) => q.id !== startedId && q.status !== "completed").sort((a, b) => a.questionIndex - b.questionIndex); const indexById = new Map([selected, ...rest].map((question, index) => [question.id, slots[index]])); return questions.map((question) => ({ ...question, questionIndex: indexById.get(question.id) ?? question.questionIndex })).sort((a, b) => a.questionIndex - b.questionIndex); }
  private findQuestion(event: QuizEventDocument, id: string): QuizEventQuestion { const question = event.questions.find((candidate) => candidate.id === id); if (!question) throw new Error("Вопрос Event не найден"); return question; }
  private assertStatus(event: QuizEventDocument, status: QuizEventDocument["status"]): void { if (event.status !== status) throw new Error(`Действие доступно только в статусе ${status}`); }
  private assertMutable(event: QuizEventDocument): void { if (event.status === "completed" || event.status === "cancelled") throw new Error("Завершённое проведение нельзя изменять"); }
}
