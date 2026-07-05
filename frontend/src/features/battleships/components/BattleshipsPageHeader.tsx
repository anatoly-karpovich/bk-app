import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import GamePageHeader from "../../../components/GamePageHeader";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsStatusChip } from "../types";

interface BattleshipsPageHeaderProps {
  pageStatusChips: BattleshipsStatusChip[];
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

export default function BattleshipsPageHeader({
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
}: BattleshipsPageHeaderProps) {
  return (
    <GamePageHeader
      breadcrumbs={battleshipsTexts.breadcrumbs.split(" / ")}
      title={battleshipsTexts.pageTitle}
      description={battleshipsTexts.pageDescription}
      chips={pageStatusChips}
      cardSx={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(236, 253, 245, 0.92) 52%, rgba(224, 242, 254, 0.95) 100%)",
      }}
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
          key: "new-game",
          label: battleshipsTexts.actions.newGame,
          icon: <DirectionsBoatRoundedIcon />,
          onClick: onStartGame,
          disabled: actionsDisabled || hasGame || !canStartGame,
          loading: isStartingGame,
          variant: "contained",
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
