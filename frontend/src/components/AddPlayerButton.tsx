import AddRoundedIcon from "@mui/icons-material/AddRounded";
import type { SxProps, Theme } from "@mui/material/styles";
import GameActionButton from "./GameActionButton";

interface AddPlayerButtonProps {
  disabled: boolean;
  onClick: () => void;
  variant?: "outlined" | "contained";
  sx?: SxProps<Theme>;
}

export default function AddPlayerButton({ disabled, onClick, variant = "outlined", sx }: AddPlayerButtonProps) {
  return <GameActionButton label="Добавить" icon={<AddRoundedIcon />} disabled={disabled} onClick={onClick} variant={variant} sx={sx} />;
}
