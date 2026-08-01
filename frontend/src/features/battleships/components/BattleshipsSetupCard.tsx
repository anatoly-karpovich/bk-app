import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import GameStartButton from "../../../components/GameStartButton";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { formatRewardPool } from "../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../rewards/types";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsBoardRules } from "../types";

interface BattleshipsSetupCardProps {
  playerName: string;
  boardConfig: BattleshipsBoardRules | null;
  resources: ResourceDefinition[];
  fleetSummary: string[];
  actionsDisabled: boolean;
  canStartGame: boolean;
  isStartingGame: boolean;
  onStartGame: () => void;
  onPlayerNameChange: (nextValue: string) => void;
}

export default function BattleshipsSetupCard({
  playerName,
  boardConfig,
  resources,
  fleetSummary,
  actionsDisabled,
  canStartGame,
  isStartingGame,
  onStartGame,
  onPlayerNameChange,
}: BattleshipsSetupCardProps) {
  return (
    <Card>
      <CardHeader
        title={battleshipsTexts.cards.setupTitle}
        subheader={battleshipsTexts.cards.setupSubtitle}
        sx={{ "& .MuiCardHeader-action": { mr: 0, mt: 0.5 } }}
        action={
          <GameStartButton
            label={battleshipsTexts.actions.newGame}
            startIcon={<DirectionsBoatRoundedIcon />}
            onClick={onStartGame}
            disabled={actionsDisabled || !canStartGame}
            loading={isStartingGame}
          />
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <GamePlayerNameInput
            label="Ник игрока"
            value={playerName}
            onChange={onPlayerNameChange}
            disabled={actionsDisabled}
          />

          {boardConfig ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <AppChip label={`Поле: ${boardConfig.boardSize}x${boardConfig.boardSize}`} color="secondary" />
                <AppChip label={`Попытки: ${boardConfig.maxShots}`} color="info" />
                <AppChip label={`Попадание: ${formatRewardPool(boardConfig.rewards.hit, resources)}`} color="success" />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {fleetSummary.map((item) => (
                  <AppChip key={item} variant="outlined" label={item} />
                ))}
              </Stack>
            </Stack>
          ) : (
            <AppInfoAlert>
              Battleships-конфиг пока недоступен для выбранного проекта.
            </AppInfoAlert>
          )}

          <Typography variant="body2" color="text.secondary">
            Старт игры создает snapshot-конфиг на backend и генерирует новую открытую доску для ведущего.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
