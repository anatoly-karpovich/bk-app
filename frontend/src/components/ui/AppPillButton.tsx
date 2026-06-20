import { Button } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type AppPillButtonProps = ButtonProps & {
  sx?: SxProps<Theme>;
  [key: string]: any;
};

export default function AppPillButton({ sx, ...props }: AppPillButtonProps) {
  return (
    <Button
      {...props}
      sx={{
        borderRadius: (theme) => theme.customRadii.pill,
        fontWeight: 700,
        ...sx,
      }}
    />
  );
}
