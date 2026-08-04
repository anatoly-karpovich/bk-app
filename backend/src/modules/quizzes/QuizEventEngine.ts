import { randomUUID } from "node:crypto";
import { RewardGrantService, addResourceAmounts } from "../rewards";
import { buildQuizMessage } from "./domain/messageBuilder";
import type {
  QuizAward, QuizChatMessageCandidate, QuizEventDocument, QuizEventQuestion, QuizEventSummary, QuizMessageKind, QuizPlayerAnswerStatus, QuizQuestion, QuizSnapshot,
} from "./domain/types";
import { QuizConflictError } from "./errors";
import { QuizAnswerRanker, type RankedQuizAnswer } from "./QuizAnswerRanker";

export class QuizEventEngine {
  constructor(private readonly rewardGrantService: RewardGrantService, private readonly answerRanker: QuizAnswerRanker) {}

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
  cancel(event: QuizEventDocument): QuizEventDocument { if (event.status === "completed") throw new QuizConflictError("Completed event cannot be cancelled"); return { ...event, status: "cancelled", currentQuestionId: null, updatedAt: new Date().toISOString() }; }

  completeEvent(event: QuizEventDocument): QuizEventDocument {
    if (!["active", "paused"].includes(event.status)) throw new QuizConflictError("Only active or paused event can be completed");
    if (event.currentQuestionId || event.questions.some((question) => !["completed", "skipped"].includes(question.status))) throw new QuizConflictError("Все вопросы должны быть завершены или пропущены");
    const now = new Date().toISOString();
    return { ...event, status: "completed", completedAt: now, summary: this.buildSummary(event, now), updatedAt: now };
  }

  startQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId) throw new QuizConflictError("Уже есть активный вопрос");
    const target = this.getQuestion(event, questionId);
    if (target.status !== "pending") throw new QuizConflictError("Начать можно только pending-вопрос");
    const now = new Date().toISOString();
    const questions = this.reindexForStartedQuestion(event.questions, questionId).map((question) => question.id === questionId ? { ...question, status: "active" as const, startedAt: now, updatedAt: now } : question);
    return { ...event, questions, currentQuestionId: questionId, updatedAt: now };
  }

  completeQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId !== questionId) throw new QuizConflictError("Этот вопрос не активен");
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
    const question = this.getQuestion(event, questionId);
    if (question.status !== "pending") throw new QuizConflictError("Пропустить можно только pending-вопрос");
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((item) => item.id === questionId ? { ...item, status: "skipped", updatedAt: now } : item), updatedAt: now };
  }

  restoreQuestion(event: QuizEventDocument, questionId: string): QuizEventDocument {
    this.assertStatus(event, "active");
    const question = this.getQuestion(event, questionId);
    if (question.status !== "skipped") throw new QuizConflictError("Восстановить можно только skipped-вопрос");
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((item) => item.id === questionId ? { ...item, status: "pending", updatedAt: now } : item), updatedAt: now };
  }

  reorder(event: QuizEventDocument, ids: string[]): QuizEventDocument {
    this.assertStatus(event, "active");
    if (event.currentQuestionId) throw new QuizConflictError("Нельзя менять порядок при активном вопросе");
    const movable = event.questions.filter((question) => question.status === "pending" || question.status === "skipped");
    if (ids.length !== movable.length || new Set(ids).size !== ids.length || ids.some((id) => !movable.some((question) => question.id === id))) throw new QuizConflictError("Список перестановки должен содержать все pending/skipped-вопросы по одному разу");
    const byId = new Map(event.questions.map((question) => [question.id, question]));
    const fixedIndexes = new Set(event.questions.filter((question) => question.status === "completed").map((question) => question.questionIndex));
    const slots = Array.from({ length: event.questions.length }, (_, index) => index + 1).filter((index) => !fixedIndexes.has(index));
    const now = new Date().toISOString();
    const nextById = new Map(ids.map((id, index) => [id, { ...byId.get(id)!, questionIndex: slots[index], updatedAt: now }]));
    return { ...event, questions: event.questions.map((question) => nextById.get(question.id) ?? question).sort((left, right) => left.questionIndex - right.questionIndex), updatedAt: now };
  }

  setMessage(event: QuizEventDocument, questionId: string, kind: QuizMessageKind, text: string | null, actorId: string): QuizEventDocument {
    this.assertMutable(event);
    this.getQuestion(event, questionId);
    const now = new Date().toISOString();
    return { ...event, questions: event.questions.map((question) => question.id !== questionId ? question : { ...question, message: kind === "question" ? { ...question.message, messageTextOverride: text, messageTextUpdatedAt: text === null ? null : now, messageTextUpdatedByUserId: text === null ? null : actorId } : { ...question.message, answerTextOverride: text, answerTextUpdatedAt: text === null ? null : now, answerTextUpdatedByUserId: text === null ? null : actorId }, updatedAt: now }), updatedAt: now };
  }

  appendChatFragment(event: QuizEventDocument, questionId: string, input: { rawText: string; parsedMessagesCount: number; candidateMessagesCount: number; duplicateMessagesCount: number; messages: QuizChatMessageCandidate[]; insertedByUserId: string }): QuizEventDocument {
    this.assertChatMutable(event);
    const target = this.getQuestion(event, questionId);
    if (!["active", "completed"].includes(target.status)) throw new QuizConflictError("Чат можно добавлять только в активный или завершённый вопрос");
    const now = new Date().toISOString();
    const fragmentId = randomUUID();
    return { ...event, questions: event.questions.map((question) => {
      if (question.id !== questionId) return question;
      let nextOrder = Math.max(0, ...question.chatMessages.map((message) => message.firstSeenOrder));
      const chatMessages = [...question.chatMessages, ...input.messages.map((message) => ({ ...message, id: randomUUID(), firstSeenFragmentId: fragmentId, firstSeenOrder: ++nextOrder }))];
      const chatFragments = [...question.chatFragments, { id: fragmentId, rawText: input.rawText, insertedAt: now, insertedByUserId: input.insertedByUserId, parsedMessagesCount: input.parsedMessagesCount, candidateMessagesCount: input.candidateMessagesCount, addedMessagesCount: input.messages.length, duplicateMessagesCount: input.duplicateMessagesCount }];
      const updated = { ...question, chatMessages, chatFragments, updatedAt: now };
      return updated.status === "completed" ? { ...updated, awards: this.calculateAwards(event.quizSnapshot, updated, now) } : updated;
    }), updatedAt: now };
  }

  setPlayerAnswer(event: QuizEventDocument, questionId: string, input: { playerName: string; status: QuizPlayerAnswerStatus; selectedMessageId: string | null; decidedByUserId: string }): QuizEventDocument {
    this.assertChatMutable(event);
    const question = this.getQuestion(event, questionId);
    if (!["active", "completed"].includes(question.status)) throw new QuizConflictError("Решение можно принять только для активного или завершённого вопроса");
    const selected = input.selectedMessageId ? question.chatMessages.find((message) => message.id === input.selectedMessageId) : null;
    if (input.status === "accepted" && !input.selectedMessageId) throw new QuizConflictError("Для принятого ответа требуется выбранное сообщение");
    if (input.status !== "accepted" && input.selectedMessageId) throw new QuizConflictError("Выбранное сообщение допускается только для принятого ответа");
    if (input.selectedMessageId && !selected) throw new QuizConflictError("Выбранное сообщение не найдено в вопросе");
    if (selected && selected.from !== input.playerName) throw new QuizConflictError("Выбранное сообщение принадлежит другому игроку");
    const now = new Date().toISOString();
    const questions = event.questions.map((item) => {
      if (item.id !== questionId) return item;
      const playerAnswers = item.playerAnswers.filter((answer) => answer.playerName !== input.playerName);
      const nextDecision = { playerName: input.playerName, status: input.status, selectedMessageId: input.status === "accepted" ? input.selectedMessageId : null, decidedAt: input.status === "pending" ? null : now, decidedByUserId: input.status === "pending" ? null : input.decidedByUserId };
      const updated = { ...item, playerAnswers: [...playerAnswers, nextDecision], updatedAt: now };
      return updated.status === "completed" ? { ...updated, awards: this.calculateAwards(event.quizSnapshot, updated, now) } : updated;
    });
    const next = { ...event, questions, updatedAt: now };
    return { ...next, summary: next.questions.some((item) => item.status === "completed") ? this.buildSummary(next, now) : next.summary };
  }

  rankedAnswers(question: QuizEventQuestion): RankedQuizAnswer[] {
    return this.answerRanker.rank(question.chatMessages, question.playerAnswers, question.startedAt);
  }

  getQuestion(event: QuizEventDocument, id: string): QuizEventQuestion {
    const question = event.questions.find((candidate) => candidate.id === id);
    if (!question) throw new QuizConflictError("Вопрос Event не найден");
    return question;
  }

  buildSummary(event: QuizEventDocument, generatedAt = new Date().toISOString()): QuizEventSummary {
    const playerEntries = new Map<string, { correctAnswers: number; regularRewards: import("../rewards").ResourceAmount[]; bonusRewards: import("../rewards").ResourceAmount[] }>();
    let totalAcceptedAnswers = 0;
    let totalUniqueCorrectAnswers = 0;
    for (const question of event.questions) {
      totalAcceptedAnswers += question.playerAnswers.filter((answer) => answer.status === "accepted").length;
      const ranked = this.rankedAnswers(question);
      totalUniqueCorrectAnswers += ranked.length;
      for (const answer of ranked) {
        const entry = playerEntries.get(answer.playerName) ?? { correctAnswers: 0, regularRewards: [], bonusRewards: [] };
        entry.correctAnswers += 1;
        for (const award of question.awards.filter((candidate) => candidate.selectedMessageId === answer.selectedMessageId)) {
          if (award.source.kind === "bonus_position") entry.bonusRewards.push(...award.resolvedRewards); else entry.regularRewards.push(...award.resolvedRewards);
        }
        playerEntries.set(answer.playerName, entry);
      }
    }
    const players = [...playerEntries.entries()].map(([playerName, entry]) => ({ playerName, correctAnswers: entry.correctAnswers, regularRewards: addResourceAmounts(entry.regularRewards), bonusRewards: addResourceAmounts(entry.bonusRewards), totalRewards: addResourceAmounts([...entry.regularRewards, ...entry.bonusRewards]) })).sort((left, right) => left.playerName.localeCompare(right.playerName, "ru"));
    return { players, totalQuestions: event.questions.length, completedQuestions: event.questions.filter((question) => question.status === "completed").length, totalAcceptedAnswers, totalUniqueCorrectAnswers, totalRewards: addResourceAmounts(players.flatMap((player) => player.totalRewards)), generatedAt };
  }

  private calculateAwards(snapshot: QuizSnapshot, question: QuizEventQuestion, now: string): QuizAward[] {
    const rule = snapshot.configRulesSnapshot.regularRewardOverrides.find((override) => override.questionIndex === question.questionIndex)?.rule ?? snapshot.configRulesSnapshot.defaultRegularRule;
    const bonuses = snapshot.configRulesSnapshot.bonusRules.filter((bonus) => bonus.questionIndex === question.questionIndex);
    return this.rankedAnswers(question).flatMap((answer) => {
      const awards: QuizAward[] = [];
      const create = (kind: QuizAward["source"]["kind"], pool: import("../rewards").AllRewardPool, bonusRuleId: string | null = null) => awards.push({ id: randomUUID(), selectedMessageId: answer.selectedMessageId, playerName: answer.playerName, questionIndex: question.questionIndex, source: { kind, questionIndex: question.questionIndex, position: answer.position, regularRuleMode: kind === "bonus_position" ? null : rule.mode, bonusRuleId }, resolvedRewards: this.rewardGrantService.resolve(pool), awardedAt: now });
      if (rule.mode === "all_accepted") create("regular_all", rule.rewardPool);
      if (rule.mode === "by_position") { const positionRule = rule.positionRewards.find((entry) => entry.position === answer.position); if (positionRule) create("regular_position", positionRule.rewardPool); }
      bonuses.filter((bonus) => bonus.position === answer.position).forEach((bonus) => create("bonus_position", bonus.rewardPool, bonus.id));
      return awards;
    });
  }

  private createQuestion(question: QuizQuestion, now: string): QuizEventQuestion { return { id: randomUUID(), quizQuestionId: question.id, questionIndex: question.questionIndex, status: "pending", message: { messageTextOverride: null, messageTextUpdatedAt: null, messageTextUpdatedByUserId: null, answerTextOverride: null, answerTextUpdatedAt: null, answerTextUpdatedByUserId: null }, chatFragments: [], chatMessages: [], playerAnswers: [], awards: [], startedAt: null, completedAt: null, updatedAt: now }; }
  private reindexForStartedQuestion(questions: QuizEventQuestion[], startedId: string): QuizEventQuestion[] { const fixed = new Set(questions.filter((q) => q.status === "completed").map((q) => q.questionIndex)); const slots = Array.from({ length: questions.length }, (_, i) => i + 1).filter((i) => !fixed.has(i)); const selected = questions.find((q) => q.id === startedId)!; const rest = questions.filter((q) => q.id !== startedId && q.status !== "completed").sort((a, b) => a.questionIndex - b.questionIndex); const indexById = new Map([selected, ...rest].map((question, index) => [question.id, slots[index]])); return questions.map((question) => ({ ...question, questionIndex: indexById.get(question.id) ?? question.questionIndex })).sort((a, b) => a.questionIndex - b.questionIndex); }
  private assertStatus(event: QuizEventDocument, status: QuizEventDocument["status"]): void { if (event.status !== status) throw new QuizConflictError(`Действие доступно только в статусе ${status}`); }
  private assertMutable(event: QuizEventDocument): void { if (event.status === "completed" || event.status === "cancelled") throw new QuizConflictError("Завершённое проведение нельзя изменять"); }
  private assertChatMutable(event: QuizEventDocument): void { if (!["active", "paused"].includes(event.status)) throw new QuizConflictError("Чат и решения доступны только до завершения проведения"); }
}
