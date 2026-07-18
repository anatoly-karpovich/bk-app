import { Button, CircularProgress } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type AppPillButtonProps = ButtonProps & {
  loading?: boolean;
  sx?: SxProps<Theme>;
  [key: string]: any;
};

export default function AppPillButton({ sx, loading = false, disabled, startIcon, children, ...props }: AppPillButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
      sx={{
        borderRadius: (theme) => theme.customRadii.pill,
        fontWeight: 700,
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}
