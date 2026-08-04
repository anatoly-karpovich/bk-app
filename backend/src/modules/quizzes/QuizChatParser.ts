import type { QuizAnswer } from "./domain/types";

export interface ParsedQuizChatLine {
  sourceLineNumber: number;
  playerName: string;
  rawMessage: string;
  transport: QuizAnswer["transport"];
  canonicalKey: string;
}

export class QuizChatParser {
  parse(input: { rawText: string; hostNickname: string }): ParsedQuizChatLine[] {
    return input.rawText.split(/\r?\n/).flatMap((line, index) => {
      const withoutTimestamp = line.replace(/^(?:\d{1,2}:\d{2}) /, "");
      const direct = this.parseDirect(withoutTimestamp, input.hostNickname);
      const clan = direct ? null : this.parseClan(withoutTimestamp);
      const parsed = direct ?? clan;
      return parsed ? [{ sourceLineNumber: index + 1, ...parsed, canonicalKey: JSON.stringify([parsed.playerName, parsed.transport, parsed.rawMessage]) }] : [];
    });
  }

  private parseDirect(line: string, hostNickname: string): Omit<ParsedQuizChatLine, "sourceLineNumber" | "canonicalKey"> | null {
    const match = /^\[(?:\*\*(?<boldPlayer>[^\]]+?)\*\*|(?<plainPlayer>[^\]]+))\] (?:(?:to)|(?:private)) \[(?<recipients>[^\]]+)\] (?<message>.+)$/.exec(line);
    if (!match?.groups) return null;
    const recipients = match.groups.recipients.split(",").map((recipient) => recipient.trim());
    if (!recipients.includes(hostNickname)) return null;
    return { playerName: match.groups.boldPlayer ?? match.groups.plainPlayer, rawMessage: match.groups.message, transport: "direct" };
  }

  private parseClan(line: string): Omit<ParsedQuizChatLine, "sourceLineNumber" | "canonicalKey"> | null {
    const standard = /^\[\*\*(?<player>[^\]]+)\*\*\] private \[\*\*klan\*\*\] (?<message>.+)$/.exec(line);
    const spaced = /^\[\*\*(?<player>[^\]]+)\*\*\] \*\*private \[\*\* \*\*klan\*\* \*\*\]\*\* (?<message>.+)$/.exec(line);
    const plain = /^\[(?<player>[^\]]+)\] private \[(?:\*\*)?klan(?:\*\*)?\] (?<message>.+)$/i.exec(line);
    const match = standard ?? spaced ?? plain;
    if (!match?.groups) return null;
    return { playerName: match.groups.player, rawMessage: match.groups.message, transport: "clan" };
  }
}
