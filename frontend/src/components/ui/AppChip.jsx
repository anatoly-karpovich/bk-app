import { Chip } from "@mui/material";

export default function AppChip({ sx, ...props }) {
  return (
    <Chip
      {...props}
      sx={{
        borderRadius: (theme) => theme.customRadii.pill,
        ...sx,
      }}
    />
  );
}
