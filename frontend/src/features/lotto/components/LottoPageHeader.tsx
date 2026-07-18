import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import GamePageHeader from "../../../components/GamePageHeader";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoStatusChip } from "../types";

interface LottoPageHeaderProps {
  pageStatusChips: LottoStatusChip[];
  canStartGame: boolean;
  hasGame: boolean;
  isStartingGame: boolean;
  isLoadingSavedGames: boolean;
  isResettingGame: boolean;
  actionsDisabled: boolean;
  onOpenRules: () => void;
  onStartGame: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function LottoPageHeader({
  pageStatusChips,
  canStartGame,
  hasGame,
  isStartingGame,
  isLoadingSavedGames,
  isResettingGame,
  actionsDisabled,
  onOpenRules,
  onStartGame,
  onOpenSavedGames,
  onRestartGame,
}: LottoPageHeaderProps) {
  return (
    <GamePageHeader
      title={lottoTexts.pageTitle}
      description={lottoTexts.pageDescription}
      chips={pageStatusChips}
      actions={[
        {
          key: "rules",
          label: lottoTexts.actions.rules,
          icon: <MenuBookRoundedIcon />,
          onClick: onOpenRules,
          disabled: actionsDisabled,
          variant: "outlined",
        },
        {
          key: "new-game",
          label: lottoTexts.actions.newGame,
          icon: <CasinoRoundedIcon />,
          onClick: onStartGame,
          disabled: actionsDisabled || hasGame || !canStartGame,
          loading: isStartingGame,
          variant: "contained",
        },
        {
          key: "saved-games",
          label: lottoTexts.actions.savedGames,
          icon: <RestoreRoundedIcon />,
          onClick: onOpenSavedGames,
          disabled: actionsDisabled,
          loading: isLoadingSavedGames,
          variant: "outlined",
        },
        {
          key: "reset",
          label: lottoTexts.actions.reset,
          icon: <AutorenewRoundedIcon />,
          onClick: onRestartGame,
          disabled: actionsDisabled && !isResettingGame,
          loading: isResettingGame,
          variant: "text",
          color: "inherit",
        },
      ]}
    />
  );
}
