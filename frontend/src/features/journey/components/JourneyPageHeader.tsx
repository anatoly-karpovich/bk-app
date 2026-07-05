import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import GamePageHeader from "../../../components/GamePageHeader";
import { journeyTexts } from "../../../texts/journeyTexts";
import type { JourneyStatusChip } from "../types";

interface JourneyPageHeaderProps {
  pageStatusChips: JourneyStatusChip[];
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

export default function JourneyPageHeader({
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
}: JourneyPageHeaderProps) {
  return (
    <GamePageHeader
      title={journeyTexts.pageTitle}
      description={journeyTexts.pageDescription}
      chips={pageStatusChips}
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
          key: "new-game",
          label: journeyTexts.actions.newGame,
          icon: <PlayArrowRoundedIcon />,
          onClick: onStartGame,
          disabled: actionsDisabled || hasGame || !canStartGame,
          loading: isStartingGame,
          variant: "contained",
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
