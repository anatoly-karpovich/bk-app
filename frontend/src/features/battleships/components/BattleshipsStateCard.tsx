import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatCurrencyValues } from "../../../lib/currencyValues";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsPersistedGame } from "../types";

interface BattleshipsStateCardProps {
  game: BattleshipsPersistedGame;
  canUndoShot: boolean;
  undoLoading: boolean;
  boardActionsDisabled: boolean;
  onUndoShot: () => void;
}

export default function BattleshipsStateCard({
  game,
  canUndoShot,
  undoLoading,
  boardActionsDisabled,
  onUndoShot,
}: BattleshipsStateCardProps) {
  const { derived } = game;

  return (
    <Card>
      <CardHeader title={battleshipsTexts.cards.stateTitle} subheader={battleshipsTexts.cards.stateSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <AppChip
              label={derived.gameIsOver ? battleshipsTexts.statuses.complete : battleshipsTexts.statuses.active}
              color={derived.gameIsOver ? "success" : "info"}
            />
            <AppChip label={`Игрок: ${game.playerName}`} color="primary" />
            <AppChip
              label={`Приз: ${formatCurrencyValues(derived.currentPrize, game.currencies, { includeZero: false }) || "0"}`}
              color="success"
            />
            <AppChip label={`Попыток: ${derived.attemptsLeft}/${derived.boardConfig.maxShots}`} color="warning" />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Проект
              </Typography>
              <Typography fontWeight={700}>{game.configName}</Typography>
            </Stack>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Ведущий
              </Typography>
              <Typography fontWeight={700}>{game.djName || "Не указан"}</Typography>
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Флот
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {derived.fleetSummary.map((item) => (
                <AppChip key={item} variant="outlined" label={item} />
              ))}
            </Stack>
          </Stack>

          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Последний ход
            </Typography>
            {derived.lastShot ? (
              <Typography>
                {derived.lastShot.coordinateLabel}: {derived.lastShot.resultLabel} (
                {formatCurrencyValues(derived.lastShot.prizeDelta, game.currencies, { showPlus: true, includeZero: false }) || "0"})
                {" - "}итого {formatCurrencyValues(derived.lastShot.totalPrize, game.currencies, { includeZero: false }) || "0"}
              </Typography>
            ) : (
              <Typography color="text.secondary">Выстрелов еще не было.</Typography>
            )}
          </Stack>

          <AppPillButton
            variant="outlined"
            startIcon={<UndoRoundedIcon />}
            onClick={onUndoShot}
            disabled={!canUndoShot || boardActionsDisabled}
            loading={undoLoading}
          >
            {battleshipsTexts.actions.undo}
          </AppPillButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
