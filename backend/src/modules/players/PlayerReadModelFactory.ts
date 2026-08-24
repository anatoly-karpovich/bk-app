import type { Player, PlayerView } from "./domain/types";

export class PlayerReadModelFactory {
  create(player: { _id: { toHexString(): string } } & Player): PlayerView {
    return {
      id: player._id.toHexString(),
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      meta: {
        projectId: player.projectId,
      },
      content: {
        nickname: player.nickname,
        aliases: player.aliases.map((alias) => alias.nickname),
      },
    };
  }
}
