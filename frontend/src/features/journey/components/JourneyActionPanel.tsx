import { Stack } from "@mui/material";
import type { ReactNode } from "react";

interface JourneyActionPanelProps {
  children: ReactNode;
}

export default function JourneyActionPanel({ children }: JourneyActionPanelProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
    </Stack>
  );
}
