import type { JourneyGameView, JourneyGameViewPlayer } from "./domain/types";
export interface JourneyForumStateMessage { text: string; generatedAt: string; }
export class JourneyForumStateFormatter {
  create(game: JourneyGameView): JourneyForumStateMessage { return { text: ["==================== Текущее положение ====================", "", ...game.state.players.filter((player) => player.status !== "removed").map((player) => this.player(player, game))].join("\n"), generatedAt: game.updatedAt }; }
  private player(player: JourneyGameViewPlayer, game: JourneyGameView): string { const values = player.balanceEntries.map((entry) => `${entry.amount} ${game.configuration.resources.find((resource) => resource.id === entry.resourceId)?.label ?? entry.resourceId}`).join(", "); return `${player.nickname}: Награда: [${values}], Клетка: [${player.position}]`; }
}
