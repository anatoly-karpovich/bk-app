import { formatJourneyCurrencyValues } from "./domain/currency";
import type { JourneyGameView, JourneyGameViewPlayer } from "./domain/types";

export interface JourneyForumStateMessage {
  text: string;
  generatedAt: string;
}

/** Builds the ready-to-copy current Journey state message for the forum. */
export class JourneyForumStateFormatter {
  create(game: JourneyGameView): JourneyForumStateMessage {
    const playerLines = game.state.players
      .filter((player) => player.status !== "removed")
      .map((player) => this.formatPlayer(player, game));

    return {
      text: ["==================== Текущее положение ====================", "", ...playerLines].join("\n"),
      generatedAt: game.updatedAt,
    };
  }

  private formatPlayer(player: JourneyGameViewPlayer, game: JourneyGameView): string {
    const balanceLabel = formatJourneyCurrencyValues(player.balanceEntries, game.configuration.currencies, {
      includeZero: true,
    });
    const details = [`${player.nickname}: Награда: [${balanceLabel}], Клетка: [${player.position}]`];

    if (player.status === "finished") {
      details.push("Финишировал(-а)");
    }

    const achievementTitles = [...new Set(player.bonuses.map((achievement) => achievement.title ?? achievement.name))];

    if (achievementTitles.length) {
      details.push(`Достижения: ${achievementTitles.map((title) => `«${title}»`).join(", ")}`);
    }

    return details.join(", ");
  }
}
