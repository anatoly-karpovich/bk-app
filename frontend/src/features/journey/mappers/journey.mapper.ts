import type { JourneyPlayer } from "../types";

function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

export function mapParsedMovesToPlayerInputs(
  parsedMoves: Record<string, number>,
  activePlayers: JourneyPlayer[],
): Record<string, string> {
  const activePlayersByNickname = activePlayers.reduce<Record<string, JourneyPlayer>>((accumulator, player) => {
    accumulator[normalizeNickname(player.nickname)] = player;
    return accumulator;
  }, {});

  return Object.entries(parsedMoves).reduce<Record<string, string>>((accumulator, [nickname, dice]) => {
    const player = activePlayersByNickname[normalizeNickname(nickname)];

    if (player) {
      accumulator[player.id] = String(dice);
    }

    return accumulator;
  }, {});
}
