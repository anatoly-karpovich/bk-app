import type { JourneyGameView, JourneyGameViewPlayer } from "./domain/types";
export interface JourneyForumStateMessage { text: string; generatedAt: string; }
export class JourneyForumStateFormatter {
  create(game: JourneyGameView): JourneyForumStateMessage {
    return {
      text: [
        "==================== Текущее положение ====================",
        "",
        ...game.state.players
          .filter((player) => player.status !== "removed")
          .flatMap((player) => this.player(player, game)),
      ].join("\n"),
      generatedAt: game.updatedAt,
    };
  }

  private player(player: JourneyGameViewPlayer, game: JourneyGameView): string[] {
    return [
      `${player.nickname}: Итоговая награда: [${this.amounts(player.balanceEntries, game)}], Клетка: [${player.position}]`,
      ...(player.bonuses.length
        ? [
            "   Бонусы:",
            ...[...player.bonuses].sort((left, right) => Number(right.source === "jackpot") - Number(left.source === "jackpot")).map((bonus) =>
              `   - ${bonus.source === "jackpot" ? "Сокровище" : `Достижение «${bonus.title ?? bonus.name}»`}: [${this.amounts(bonus.appliedRewards, game, "без дополнительной награды")}]`,
            ),
          ]
        : []),
    ];
  }

  private amounts(
    amounts: JourneyGameViewPlayer["balanceEntries"],
    game: JourneyGameView,
    emptyLabel = "",
  ): string {
    const values = amounts
      .filter((entry) => entry.amount !== 0)
      .map((entry) => `${entry.amount} ${game.configuration.resources.find((resource) => resource.id === entry.resourceId)?.label ?? entry.resourceId}`);
    return values.join(", ") || emptyLabel;
  }
}
