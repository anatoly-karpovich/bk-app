import type { ReactNode } from "react";
import AppPillButton from "./ui/AppPillButton";

interface GameStartButtonProps {
  label: string;
  startIcon: ReactNode;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function GameStartButton({ label, startIcon, disabled, loading, onClick }: GameStartButtonProps) {
  return (
    <AppPillButton
      variant="contained"
      size="small"
      startIcon={startIcon}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      sx={{ whiteSpace: "nowrap" }}
    >
      {label}
    </AppPillButton>
  );
}
