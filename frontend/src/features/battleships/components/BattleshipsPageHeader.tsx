import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsStatusChip } from "../types";

interface BattleshipsPageHeaderProps {
  pageStatusChips: BattleshipsStatusChip[];
  isLoadingSavedGames: boolean;
  isResettingGame: boolean;
  actionsDisabled: boolean;
  controls?: ReactNode;
  onOpenRules: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function BattleshipsPageHeader({
  pageStatusChips,
  isLoadingSavedGames,
  isResettingGame,
  actionsDisabled,
  controls,
  onOpenRules,
  onOpenSavedGames,
  onRestartGame,
}: BattleshipsPageHeaderProps) {
  return (
    <GamePageHeader
      breadcrumbPath="/battleship"
      title={battleshipsTexts.pageTitle}
      description={battleshipsTexts.pageDescription}
      chips={pageStatusChips}
      controls={controls}
      actions={[
        {
          key: "rules",
          label: battleshipsTexts.actions.rules,
          icon: <MenuBookRoundedIcon />,
          onClick: onOpenRules,
          disabled: actionsDisabled,
          variant: "outlined",
        },
        {
          key: "saved-games",
          label: battleshipsTexts.actions.savedGames,
          icon: <RestoreRoundedIcon />,
          onClick: onOpenSavedGames,
          disabled: actionsDisabled,
          loading: isLoadingSavedGames,
          variant: "outlined",
        },
        {
          key: "reset",
          label: battleshipsTexts.actions.reset,
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
