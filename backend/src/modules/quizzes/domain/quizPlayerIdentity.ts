import { toPlayerNicknameKey } from "../../players/domain/normalizePlayerNickname";

export function quizPlayerIdentityKeys(identity: { playerName: string; playerRefId?: string }): string[] {
  const nicknameKey = `nickname:${toPlayerNicknameKey(identity.playerName)}`;
  return identity.playerRefId ? [`player:${identity.playerRefId}`, nicknameKey] : [nicknameKey];
}
