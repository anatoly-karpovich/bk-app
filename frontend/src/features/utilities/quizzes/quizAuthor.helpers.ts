export const unavailableQuizAuthorLabel = "Автор недоступен";

export function getQuizAuthorLabel(createdByNickname: string | null): string {
  return createdByNickname ?? unavailableQuizAuthorLabel;
}
