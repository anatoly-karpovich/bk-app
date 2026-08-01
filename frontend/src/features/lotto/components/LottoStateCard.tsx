import { Button, Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoPersistedGame } from "../types";

interface LottoStateCardProps {
  game: LottoPersistedGame | null;
  canDrawNextNumber: boolean;
  actionsDisabled: boolean;
  onDrawNextNumber: () => void;
}

export default function LottoStateCard({
  game,
  canDrawNextNumber,
  actionsDisabled,
  onDrawNextNumber,
}: LottoStateCardProps) {
  return (
    <Card>
      <CardHeader
        title={lottoTexts.cards.stateTitle}
        subheader={lottoTexts.cards.stateSubtitle}
        action={
          canDrawNextNumber ? (
            <Button variant="outlined" color="primary" onClick={onDrawNextNumber} disabled={actionsDisabled}>
              {lottoTexts.actions.draw}
            </Button>
          ) : null
        }
      />
      <CardContent>
        {!game ? (
          <AppInfoAlert>{lottoTexts.alerts.stateEmpty}</AppInfoAlert>
        ) : (
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            <Typography variant="body2" color="text.secondary">
              Статус: {game.derived.gameIsOver ? lottoTexts.statuses.complete : lottoTexts.statuses.active}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Выпавших чисел: {game.derived.drawCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Последнее число: {game.derived.lastDrawnNumber ?? "—"}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
