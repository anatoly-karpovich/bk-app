import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoStatusChip } from "../types";

interface LottoPageHeaderProps {
  pageStatusChips: LottoStatusChip[];
  isLoadingSavedGames: boolean;
  isResettingGame: boolean;
  actionsDisabled: boolean;
  controls?: ReactNode;
  onOpenRules: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function LottoPageHeader({
  pageStatusChips,
  isLoadingSavedGames,
  isResettingGame,
  actionsDisabled,
  controls,
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
          key: "rules",
          label: lottoTexts.actions.rules,
          icon: <MenuBookRoundedIcon />,
          onClick: onOpenRules,
          disabled: actionsDisabled,
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
