import type { ParsedChatMessage } from "./domain/types";

export class ChatParser {
  parse(rawText: string): ParsedChatMessage[] {
    return rawText.split(/\r?\n/).flatMap((rawLine, index) => {
      if (!rawLine.trim()) return [];

      const { line, timestamp } = this.stripTimestamp(rawLine);
      const parsed = this.parseLine(this.stripClipboardPrefix(line));
      return parsed ? [{ ...parsed, timestamp, sourceLineNumber: index + 1 }] : [];
    });
  }

  private stripTimestamp(rawLine: string): { line: string; timestamp: string | null } {
    const match = /^(?<hour>\d{1,2}):(?<minute>\d{2}) (?<line>.*)$/.exec(rawLine);
    if (!match?.groups) return { line: rawLine, timestamp: null };
    const hour = Number(match.groups.hour);
    const minute = Number(match.groups.minute);
    if (hour > 23 || minute > 59) return { line: rawLine, timestamp: null };
    return {
      line: match.groups.line,
      timestamp: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  private parseLine(line: string): Omit<ParsedChatMessage, "timestamp" | "sourceLineNumber"> | null {
    const spacedClan = /^\[\*\*(?<from>[^\[\]]+?)\*\*\] \*\*private \[\*\* \*\*klan\*\* \*\*\]\*\* (?<text>.+)$/.exec(
      line,
    );
    if (spacedClan?.groups) return { from: spacedClan.groups.from, to: ["klan"], text: spacedClan.groups.text };

    const direct =
      /^\[(?:\*\*(?<boldFrom>[^\[\]]+?)\*\*|(?<plainFrom>[^\[\]]+?))\] (?:(?:to)|(?:private)) \[(?<recipients>[^\]]+)\] (?<text>.+)$/.exec(
        line,
      );
    if (direct?.groups) {
      const from = direct.groups.boldFrom ?? direct.groups.plainFrom;
      const to = direct.groups.recipients.split(",").map((recipient) => this.stripRecipientMarkup(recipient.trim()));
      if (!from || to.some((recipient) => !recipient)) return null;
      return { from, to, text: direct.groups.text };
    }

    const publicMessage =
      /^\[(?:\*\*(?<boldFrom>[^\[\]]+?)\*\*|(?<plainFrom>[^\[\]]+?))\]\s*(?:,\s*)?(?<text>.+)$/.exec(line);
    if (!publicMessage?.groups) return null;
    const from = publicMessage.groups.boldFrom ?? publicMessage.groups.plainFrom;
    return from ? { from, to: [], text: publicMessage.groups.text } : null;
  }

  private stripClipboardPrefix(line: string): string {
    const markerIndex = line.indexOf("[");
    if (markerIndex <= 0) return line;
    const prefix = line.slice(0, markerIndex);
    return /^[:\d\s]*$/.test(prefix) ? line.slice(markerIndex) : line;
  }

  private stripRecipientMarkup(recipient: string): string {
    const match = /^\*\*(?<nickname>.+?)\*\*$/.exec(recipient);
    return match?.groups?.nickname ?? recipient;
  }
}
