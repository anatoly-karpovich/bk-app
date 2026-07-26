import type { JourneyPlayerReadModel } from "../types";

function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

export function mapParsedMovesToPlayerInputs(
  parsedMoves: Record<string, number>,
  activePlayers: JourneyPlayerReadModel[],
): Record<string, string> {
  const activePlayersByNickname = activePlayers.reduce<Record<string, JourneyPlayerReadModel>>((accumulator, player) => {
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
