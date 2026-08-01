import type { ReactNode } from "react";
import AppPillButton from "./ui/AppPillButton";

interface GameActionButtonProps {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  loading?: boolean;
  onClick: () => void;
  variant?: "contained" | "outlined";
}

export default function GameActionButton({
  label,
  icon,
  disabled,
  loading = false,
  onClick,
  variant = "outlined",
}: GameActionButtonProps) {
  return (
    <AppPillButton
      variant={variant}
      size="small"
      startIcon={icon}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      sx={{ minHeight: 40, px: 1.75, whiteSpace: "nowrap" }}
    >
      {label}
    </AppPillButton>
  );
}
