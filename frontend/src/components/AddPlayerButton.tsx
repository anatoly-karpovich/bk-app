import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GameActionButton from "./GameActionButton";

interface AddPlayerButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function AddPlayerButton({ disabled, onClick }: AddPlayerButtonProps) {
  return <GameActionButton label="Добавить" icon={<AddRoundedIcon />} disabled={disabled} onClick={onClick} />;
}
