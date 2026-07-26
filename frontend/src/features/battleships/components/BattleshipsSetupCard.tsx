import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import SailingRoundedIcon from "@mui/icons-material/SailingRounded";
import { Alert, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatCurrencyValues, type CurrencyDefinition } from "../../../lib/currencyValues";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsBoardRules } from "../types";

interface BattleshipsSetupCardProps {
  playerName: string;
  boardConfig: BattleshipsBoardRules | null;
  currencies: CurrencyDefinition[];
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
  currencies,
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
        action={
          <AppPillButton
            variant="contained"
            size="small"
            startIcon={<DirectionsBoatRoundedIcon />}
            onClick={onStartGame}
            disabled={actionsDisabled || !canStartGame}
            loading={isStartingGame}
            sx={{ mt: 0.5 }}
          >
            {battleshipsTexts.actions.newGame}
          </AppPillButton>
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <GamePlayerNameInput label="Ник игрока" value={playerName} onChange={onPlayerNameChange} disabled={actionsDisabled} />

          {boardConfig ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <AppChip label={`Поле: ${boardConfig.boardSize}x${boardConfig.boardSize}`} color="secondary" />
                <AppChip label={`Попытки: ${boardConfig.maxShots}`} color="info" />
                <AppChip
                  label={`Попадание: ${formatCurrencyValues(boardConfig.prizes.shoot, currencies, { showPlus: true, includeZero: false }) || "0"}`}
                  color="success"
                />
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
