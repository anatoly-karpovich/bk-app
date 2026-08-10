import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoStatusChip } from "../types";

interface LottoPageHeaderProps {
  pageStatusChips: LottoStatusChip[];
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

export default function LottoPageHeader({
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
}: LottoPageHeaderProps) {
  return (
    <GamePageHeader
      breadcrumbPath="/lotto"
      title={lottoTexts.pageTitle}
      description={lottoTexts.pageDescription}
      chips={pageStatusChips}
      controls={controls}
      actions={[
        {
          key: "refresh",
          label: lottoTexts.actions.refresh,
          icon: <RefreshRoundedIcon />,
          onClick: onRefreshGame,
          disabled: actionsDisabled || !canRefreshGame,
          loading: isRefreshingGame,
          variant: "outlined",
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
      ]}
      moreActions={[
        {
          key: "rules",
          label: lottoTexts.actions.rules,
          icon: <MenuBookRoundedIcon fontSize="small" />,
          onClick: onOpenRules,
        },
        {
          key: "reset",
          label: lottoTexts.actions.reset,
          icon: <AutorenewRoundedIcon fontSize="small" />,
          onClick: onRestartGame,
          dividerBefore: true,
        },
      ]}
      moreActionsDisabled={actionsDisabled}
    />
  );
}
