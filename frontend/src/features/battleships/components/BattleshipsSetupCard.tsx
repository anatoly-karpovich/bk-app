import SailingRoundedIcon from "@mui/icons-material/SailingRounded";
import { Alert, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppTextInput from "../../../components/ui/AppTextInput";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsBoardRules } from "../types";

interface BattleshipsSetupCardProps {
  playerName: string;
  boardConfig: BattleshipsBoardRules | null;
  fleetSummary: string[];
  actionsDisabled: boolean;
  onPlayerNameChange: (nextValue: string) => void;
}

export default function BattleshipsSetupCard({
  playerName,
  boardConfig,
  fleetSummary,
  actionsDisabled,
  onPlayerNameChange,
}: BattleshipsSetupCardProps) {
  return (
    <Card>
      <CardHeader title={battleshipsTexts.cards.setupTitle} subheader={battleshipsTexts.cards.setupSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          <AppTextInput
            label="Ник игрока"
            placeholder="Введите ник игрока"
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            disabled={actionsDisabled}
            fullWidth
          />

          {boardConfig ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <AppChip label={`Поле: ${boardConfig.boardSize}x${boardConfig.boardSize}`} color="secondary" />
                <AppChip label={`Попытки: ${boardConfig.maxShots}`} color="info" />
                <AppChip label={`Попадание: +${boardConfig.prizes.shoot} ${boardConfig.currency}`} color="success" />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {fleetSummary.map((item) => (
                  <AppChip key={item} variant="outlined" label={item} />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Alert severity="info" icon={<SailingRoundedIcon fontSize="inherit" />}>
              Battleships-конфиг пока недоступен для выбранного проекта.
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Старт игры создает snapshot-конфиг на backend и генерирует новую открытую доску для ведущего.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
