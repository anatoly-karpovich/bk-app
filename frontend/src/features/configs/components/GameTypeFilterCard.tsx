import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../../components/ui/AppSelectableListItem";
import { gameConfigsTexts } from "../../../texts/gameConfigsTexts";
import type { GameType } from "../../projects/types";

const gameIcons: Record<GameType, typeof TravelExploreRoundedIcon> = {
  journey: TravelExploreRoundedIcon,
  lotto: CasinoRoundedIcon,
  lotto_bingo: ConfirmationNumberRoundedIcon,
  battleships: DirectionsBoatRoundedIcon,
};

interface GameTypeFilterCardProps {
  gameTypes: readonly GameType[];
  selectedGameType: GameType;
  configCounts: Record<GameType, number>;
  onSelect: (gameType: GameType) => void;
}

export default function GameTypeFilterCard({
  gameTypes,
  selectedGameType,
  configCounts,
  onSelect,
}: GameTypeFilterCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
            <Box>
              <Typography variant="h5">{gameConfigsTexts.filter.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {gameConfigsTexts.filter.description}
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1}>
            {gameTypes.map((gameType) => {
              const Icon = gameIcons[gameType];
              const configsCount = configCounts[gameType];

              return (
                <AppSelectableListItem
                  key={gameType}
                  primaryText={gameConfigsTexts.section.gameName(gameType)}
                  secondaryText={gameConfigsTexts.filter.configCount(configsCount)}
                  icon={<Icon fontSize="small" />}
                  selected={gameType === selectedGameType}
                  onClick={() => onSelect(gameType)}
                />
              );
            })}
          </Stack>

          <AppInfoAlert sx={{ mt: 1 }}>{gameConfigsTexts.filter.info}</AppInfoAlert>
        </Stack>
      </CardContent>
    </Card>
  );
}
