export function normalizePlayerNickname(nickname: string): string {
  return nickname.trim();
}

export function toPlayerNicknameKey(nickname: string): string {
  return normalizePlayerNickname(nickname).toLocaleLowerCase("ru");
}
