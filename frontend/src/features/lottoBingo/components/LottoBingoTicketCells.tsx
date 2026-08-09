import { Box } from "@mui/material";
import type { LottoBingoCandidate, LottoBingoTicketGrid } from "../types";

interface Props {
  grid: LottoBingoTicketGrid;
  matchedNumbers: number[];
  candidate?: LottoBingoCandidate;
  minHeight?: number;
}

export default function LottoBingoTicketCells({ grid, matchedNumbers, candidate, minHeight = 33 }: Props) {
  const matched = new Set(matchedNumbers);
  const candidateRows = new Set(candidate?.matchedAreas.flatMap((area) => area.rowIndexes) ?? []);
  const candidateHalves = new Set(candidate?.matchedAreas.map((area) => area.half).filter((half): half is "top" | "bottom" => Boolean(half)) ?? []);

  return <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 0.45 }}>
    {grid.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
      const isMatched = value !== null && matched.has(value);
      const highlightedRow = candidateRows.has(rowIndex);
      const highlightedHalf = candidateHalves.has(rowIndex < 3 ? "top" : "bottom");

      return <Box key={`${rowIndex}-${columnIndex}`} sx={{ minHeight, mt: rowIndex === 3 ? 1.5 : 0, display: "grid", placeItems: "center", borderRadius: 0.5, border: "1px solid", borderColor: value === null ? "#dddfe3" : highlightedRow ? "#55b46e" : isMatched ? "#8f95ef" : "#c9cdd2", bgcolor: value === null ? "#eceeef" : highlightedRow ? "#dcfce7" : highlightedHalf ? "#ecfdf5" : isMatched ? "#dfe3ff" : "common.white", color: value === null ? "transparent" : highlightedRow ? "#14532d" : isMatched ? "#262464" : "text.primary", fontSize: "0.78rem", fontWeight: 800 }}>{value ?? "·"}</Box>;
    }))}
  </Box>;
}
