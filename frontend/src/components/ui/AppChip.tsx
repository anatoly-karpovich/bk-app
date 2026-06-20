import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface AppChipProps extends ChipProps {
  sx?: SxProps<Theme>;
}

export default function AppChip({ sx, ...props }: AppChipProps) {
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
