import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { journeyTexts } from "../../../texts/journeyTexts";
import type { JourneyStatusChip } from "../types";

interface JourneyPageHeaderProps {
  pageStatusChips: JourneyStatusChip[];
  isRefreshingGame: boolean;
  isLoadingSavedGames: boolean;
  actionsDisabled: boolean;
  canOpenRules: boolean;
  controls?: ReactNode;
  onRefreshGame: () => void;
  onOpenRules: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function JourneyPageHeader({
  pageStatusChips,
  isRefreshingGame,
  isLoadingSavedGames,
  actionsDisabled,
  canOpenRules,
  controls,
  onRefreshGame,
  onOpenRules,
  onOpenSavedGames,
  onRestartGame,
}: JourneyPageHeaderProps) {
  return (
    <GamePageHeader
      breadcrumbPath="/journey"
      title={journeyTexts.pageTitle}
      description={journeyTexts.pageDescription}
      chips={pageStatusChips}
      controls={controls}
      actions={[
        {
          key: "refresh",
          label: "Обновить",
          icon: <RefreshRoundedIcon />,
          onClick: onRefreshGame,
          disabled: actionsDisabled,
          loading: isRefreshingGame,
          variant: "outlined",
        },
        {
          key: "saved-games",
          label: "Сохраненные игры",
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
          label: journeyTexts.actions.rules,
          icon: <MenuBookRoundedIcon fontSize="small" />,
          onClick: onOpenRules,
          disabled: !canOpenRules,
        },
        {
          key: "reset",
          label: "Сбросить рабочий экран",
          icon: <AutorenewRoundedIcon fontSize="small" />,
          onClick: onRestartGame,
          dividerBefore: true,
        },
      ]}
      moreActionsDisabled={actionsDisabled}
    />
  );
}
