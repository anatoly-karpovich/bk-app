import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../../lib/apiClient";
import { quizzesApi } from "../api/quizzes.client";
import type {
  QuizAnswerSelectionDraft,
  QuizEvent,
  QuizEventQuestion,
  QuizMessageKind,
} from "../types";

type QuizDraftsByQuestion = Record<string, QuizAnswerSelectionDraft>;

function createSelectionDraft(question: QuizEventQuestion): QuizAnswerSelectionDraft {
  return Object.fromEntries(question.playerGroups.map((group) => [
    group.playerName,
    {
      isSelected: group.selectedMessageId !== null,
      selectedMessageId: group.selectedMessageId ?? group.messages[0]?.id ?? null,
    },
  ]));
}

function reconcileSelectionDraft(
  question: QuizEventQuestion,
  previous: QuizAnswerSelectionDraft | undefined,
): QuizAnswerSelectionDraft {
  if (!previous) return createSelectionDraft(question);

  return Object.fromEntries(question.playerGroups.map((group) => {
    const current = previous[group.playerName];
    if (!current) {
      return [group.playerName, {
        isSelected: group.selectedMessageId !== null,
        selectedMessageId: group.selectedMessageId ?? group.messages[0]?.id ?? null,
      }];
    }
    const selectedMessageExists = group.messages.some((message) => message.id === current.selectedMessageId);
    return [group.playerName, {
      isSelected: current.isSelected,
      selectedMessageId: selectedMessageExists ? current.selectedMessageId : (group.messages[0]?.id ?? null),
    }];
  }));
}

function reconcileDrafts(
  event: QuizEvent,
  previous: QuizDraftsByQuestion,
  resetQuestionId?: string,
): QuizDraftsByQuestion {
  return Object.fromEntries(event.questions.map((question) => [
    question.id,
    question.id === resetQuestionId
      ? createSelectionDraft(question)
      : reconcileSelectionDraft(question, previous[question.id]),
  ]));
}

function selectionDraftIsDirty(question: QuizEventQuestion, draft: QuizAnswerSelectionDraft | undefined): boolean {
  const current = draft ?? createSelectionDraft(question);
  return question.playerGroups.some((group) => {
    const choice = current[group.playerName];
    return (choice?.isSelected ?? false) !== (group.selectedMessageId !== null)
      || (choice?.isSelected && choice.selectedMessageId !== group.selectedMessageId);
  });
}

export function useQuizEvent(projectId: string | undefined, eventId: string | undefined) {
  const [event, setEvent] = useState<QuizEvent | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [selectionDrafts, setSelectionDrafts] = useState<QuizDraftsByQuestion>({});
  const [loading, setLoading] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyEvent = useCallback((nextEvent: QuizEvent, resetQuestionId?: string) => {
    setEvent(nextEvent);
    setSelectionDrafts((current) => reconcileDrafts(nextEvent, current, resetQuestionId));
    setSelectedQuestionId((current) =>
      nextEvent.questions.some((question) => question.id === current)
        ? current
        : (nextEvent.questions[0]?.id ?? ""),
    );
  }, []);

  const load = useCallback(async () => {
    if (!projectId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      applyEvent(await quizzesApi.getEvent(projectId, eventId));
    } catch (cause) {
      setEvent(null);
      setSelectionDrafts({});
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить проведение.");
    } finally {
      setLoading(false);
    }
  }, [applyEvent, eventId, projectId]);

  useEffect(() => { void load(); }, [load]);

  const refreshAfterConflict = useCallback(async () => {
    if (!projectId || !eventId) return;
    try {
      applyEvent(await quizzesApi.getEvent(projectId, eventId));
      setError("Проведение изменилось в другой вкладке. Загружена актуальная версия; проверьте данные и повторите действие.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить проведение после конфликта.");
    }
  }, [applyEvent, eventId, projectId]);

  const runMutation = useCallback(async <T,>(
    mutation: (currentEvent: QuizEvent) => Promise<T>,
    getEvent: (result: T) => QuizEvent,
    resetQuestionId?: string,
  ): Promise<T | null> => {
    if (!event) return null;
    setMutationBusy(true);
    setError(null);
    try {
      const result = await mutation(event);
      applyEvent(getEvent(result), resetQuestionId);
      return result;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await refreshAfterConflict();
      } else {
        setError(cause instanceof Error ? cause.message : "Не удалось сохранить проведение.");
      }
      return null;
    } finally {
      setMutationBusy(false);
    }
  }, [applyEvent, event, refreshAfterConflict]);

  const updateDraft = useCallback((questionId: string, playerName: string, update: Partial<QuizAnswerSelectionDraft[string]>) => {
    setSelectionDrafts((current) => {
      const question = event?.questions.find((candidate) => candidate.id === questionId);
      if (!question) return current;
      const draft = current[questionId] ?? createSelectionDraft(question);
      const player = draft[playerName];
      if (!player) return current;
      return {
        ...current,
        [questionId]: {
          ...draft,
          [playerName]: { ...player, ...update },
        },
      };
    });
  }, [event]);

  const actions = {
    complete: () => runMutation(
      (current) => quizzesApi.completeEvent(projectId!, current.id, current.revision),
      (result) => result,
    ),
    reopen: () => runMutation(
      (current) => quizzesApi.reopenEvent(projectId!, current.id, current.revision),
      (result) => result,
    ),
    markAsNotConducted: (questionId: string) => runMutation(
      (current) => quizzesApi.markQuestionAsNotConducted(projectId!, current.id, questionId, current.revision),
      (result) => result,
    ),
    saveQuestionChat: (questionId: string, rawText: string) => runMutation(
      (current) => quizzesApi.saveQuestionChat(projectId!, current.id, questionId, rawText, current.revision),
      (result) => result.event,
    ),
    saveQuestionResult: (questionId: string) => {
      const question = event?.questions.find((candidate) => candidate.id === questionId);
      if (!question) return Promise.resolve(null);
      const draft = selectionDrafts[questionId] ?? createSelectionDraft(question);
      const selections = Object.entries(draft)
        .filter(([, choice]) => choice.isSelected && choice.selectedMessageId !== null)
        .map(([playerName, choice]) => ({ playerName, selectedMessageId: choice.selectedMessageId! }));
      return runMutation(
        (current) => quizzesApi.saveQuestionResult(projectId!, current.id, questionId, selections, current.revision),
        (result) => result.event,
        questionId,
      );
    },
    setMessage: (questionId: string, kind: QuizMessageKind, text: string | null) => runMutation(
      (current) => quizzesApi.setMessage(projectId!, current.id, questionId, kind, text, current.revision),
      (result) => result,
    ),
    clearMessage: (questionId: string, kind: QuizMessageKind) => runMutation(
      (current) => quizzesApi.clearMessage(projectId!, current.id, questionId, kind, current.revision),
      (result) => result,
    ),
    delete: async () => {
      if (!event || !projectId) return false;
      setMutationBusy(true);
      setError(null);
      try {
        await quizzesApi.deleteEvent(projectId, event.id, event.revision);
        return true;
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 409) await refreshAfterConflict();
        else setError(cause instanceof Error ? cause.message : "Не удалось удалить проведение.");
        return false;
      } finally {
        setMutationBusy(false);
      }
    },
  };

  return {
    event,
    selectedQuestionId,
    selectQuestion: setSelectedQuestionId,
    selectionDrafts,
    isSelectionDraftDirty: (questionId: string) => {
      const question = event?.questions.find((candidate) => candidate.id === questionId);
      return question ? selectionDraftIsDirty(question, selectionDrafts[questionId]) : false;
    },
    setPlayerSelected: (questionId: string, playerName: string, isSelected: boolean) => updateDraft(questionId, playerName, { isSelected }),
    setPlayerSelectedMessage: (questionId: string, playerName: string, selectedMessageId: string) => updateDraft(questionId, playerName, { selectedMessageId }),
    loading,
    mutationBusy,
    error,
    reload: load,
    actions,
  };
}
