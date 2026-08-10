import { Box } from "@mui/material";
import type { LottoBingoCandidate, LottoBingoTicketGrid } from "../types";

interface Props {
  grid: LottoBingoTicketGrid;
  matchedNumbers: number[];
  candidate?: LottoBingoCandidate;
  winner?: boolean;
  minHeight?: number;
  variant?: "default" | "screenshot";
}

export default function LottoBingoTicketCells({
  grid,
  matchedNumbers,
  candidate,
  winner = false,
  minHeight = 33,
  variant = "default",
}: Props) {
  const matched = new Set(matchedNumbers);
  const candidateRows = new Set(candidate?.matchedAreas.flatMap((area) => area.rowIndexes) ?? []);
  const candidateHalves = new Set(
    candidate?.matchedAreas.map((area) => area.half).filter((half): half is "top" | "bottom" => Boolean(half)) ?? [],
  );
  const isScreenshot = variant === "screenshot";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: isScreenshot ? `repeat(9, ${minHeight}px)` : "repeat(9, minmax(0, 1fr))",
        gap: isScreenshot ? 0.4 : 0.45,
        width: "fit-content",
      }}
    >
      {grid.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const isMatched = value !== null && matched.has(value);
          const highlightedRow = candidateRows.has(rowIndex);
          const highlightedHalf = candidateHalves.has(rowIndex < 3 ? "top" : "bottom");

          return (
            <Box
              key={`${rowIndex}-${columnIndex}`}
              sx={{
                position: "relative",
                overflow: "hidden",
                minHeight,
                mt: rowIndex === 3 ? 1.5 : 0,
                display: "grid",
                placeItems: "center",
                borderRadius: isScreenshot ? 0.25 : 0.5,
                border: "1px solid",
                borderColor: isScreenshot
                  ? "#cb4942"
                  : value === null
                    ? "#dddfe3"
                    : highlightedRow
                      ? "#55b46e"
                      : isMatched
                        ? "#8f95ef"
                        : "#c9cdd2",
                bgcolor: isScreenshot
                  ? winner
                    ? "#ebd27b"
                    : highlightedRow
                      ? "#f9e2e0"
                      : highlightedHalf
                        ? "#faeeee"
                        : "#eeeeee"
                  : value === null
                    ? "#eceeef"
                    : highlightedRow
                      ? "#dcfce7"
                      : highlightedHalf
                        ? "#ecfdf5"
                        : isMatched
                          ? "#dfe3ff"
                          : "common.white",
                color:
                  value === null ? "transparent" : highlightedRow ? "#14532d" : isMatched ? "#262464" : "text.primary",
                fontSize: isScreenshot ? (minHeight >= 40 ? "1.3rem" : "1.2rem") : "0.78rem",
                fontWeight: 900,
                lineHeight: 1,
                whiteSpace: "nowrap",
                "&::before, &::after":
                  isScreenshot && isMatched
                    ? {
                        content: '""',
                        position: "absolute",
                        width: "82%",
                        height: 2,
                        borderRadius: 99,
                        bgcolor: "#bf332f",
                        zIndex: 1,
                      }
                    : undefined,
                "&::before": isScreenshot && isMatched ? { transform: "rotate(45deg)" } : undefined,
                "&::after": isScreenshot && isMatched ? { transform: "rotate(-45deg)" } : undefined,
              }}
            >
              {value ?? "·"}
            </Box>
          );
        }),
      )}
    </Box>
  );
}
