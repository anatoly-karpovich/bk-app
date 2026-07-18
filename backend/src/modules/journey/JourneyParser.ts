import { parseMovesFromForum, parsePlayerNamesFromForum } from "./domain/parsers";

export class JourneyParser {
  parsePlayers(text: string, djName = ""): string[] {
    return parsePlayerNamesFromForum(text, djName);
  }

  parseMoves(text: string): Record<string, number> {
    return parseMovesFromForum(text);
  }
}
