import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsStatusChip } from "../types";

interface BattleshipsPageHeaderProps {
  pageStatusChips: BattleshipsStatusChip[];
  isRefreshingGame: boolean;
  isLoadingSavedGames: boolean;
  actionsDisabled: boolean;
  canRefreshGame: boolean;
  controls?: ReactNode;
  onRefreshGame: () => void;
  onOpenRules: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function BattleshipsPageHeader({
  pageStatusChips,
  isRefreshingGame,
  isLoadingSavedGames,
  actionsDisabled,
  canRefreshGame,
  controls,
  onRefreshGame,
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
          key: "refresh",
          label: battleshipsTexts.actions.refresh,
          icon: <RefreshRoundedIcon />,
          onClick: onRefreshGame,
          disabled: actionsDisabled || !canRefreshGame,
          loading: isRefreshingGame,
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
      ]}
      moreActions={[
        {
          key: "rules",
          label: battleshipsTexts.actions.rules,
          icon: <MenuBookRoundedIcon fontSize="small" />,
          onClick: onOpenRules,
        },
        {
          key: "reset",
          label: battleshipsTexts.actions.reset,
          icon: <AutorenewRoundedIcon fontSize="small" />,
          onClick: onRestartGame,
          dividerBefore: true,
        },
      ]}
      moreActionsDisabled={actionsDisabled}
    />
  );
}
