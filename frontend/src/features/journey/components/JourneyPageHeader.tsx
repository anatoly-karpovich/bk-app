import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { ReactNode } from "react";
import GamePageHeader from "../../../components/GamePageHeader";
import { journeyTexts } from "../../../texts/journeyTexts";
import type { JourneyStatusChip } from "../types";

interface JourneyPageHeaderProps {
  pageStatusChips: JourneyStatusChip[];
  isLoadingSavedGames: boolean;
  isResettingGame: boolean;
  actionsDisabled: boolean;
  controls?: ReactNode;
  onOpenRules: () => void;
  onOpenSavedGames: () => void;
  onRestartGame: () => void;
}

export default function JourneyPageHeader({
  pageStatusChips,
  isLoadingSavedGames,
  isResettingGame,
  actionsDisabled,
  controls,
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
          key: "rules",
          label: journeyTexts.actions.rules,
          icon: <MenuBookRoundedIcon />,
          onClick: onOpenRules,
          disabled: actionsDisabled,
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
        {
          key: "reset",
          label: journeyTexts.actions.reset,
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
