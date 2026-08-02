import { Box } from "@mui/material";

interface BattleshipsShipPreviewProps {
  size: number;
  compact?: boolean;
  muted?: boolean;
}

export default function BattleshipsShipPreview({
  size,
  compact = false,
  muted = false,
}: BattleshipsShipPreviewProps) {
  const cellSize = compact ? 18 : 26;

  return (
    <Box aria-hidden="true" sx={{ display: "flex", gap: 0.5 }}>
      {Array.from({ length: size }, (_, index) => (
        <Box
          key={index}
          sx={{
            width: cellSize,
            height: cellSize,
            borderRadius: 1,
            border: "1px solid",
            borderColor: muted ? "divider" : "secondary.light",
            bgcolor: muted ? "action.hover" : "rgba(8, 145, 178, 0.12)",
          }}
        />
      ))}
    </Box>
  );
}
