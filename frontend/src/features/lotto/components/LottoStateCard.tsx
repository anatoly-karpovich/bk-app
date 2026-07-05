import { Alert, Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import type { LottoPersistedGame } from "../types";
import { lottoTexts } from "../../../texts/lottoTexts";

interface LottoStateCardProps {
  game: LottoPersistedGame | null;
  currency: string;
}

export default function LottoStateCard({ game, currency }: LottoStateCardProps) {
  return (
    <Card>
      <CardHeader title={lottoTexts.cards.stateTitle} subheader={lottoTexts.cards.stateSubtitle} />
      <CardContent>
        {!game ? (
          <Alert severity="info">{lottoTexts.alerts.stateEmpty}</Alert>
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
            <Typography variant="body2" color="text.secondary">
              Диапазон: {game.rules.min}-{game.rules.max}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Чисел в карточке: {game.rules.cardNumbersAmount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1 место: {game.rules.firstPlacePrize} {currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              2 место: {game.rules.secondPlacePrize} {currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Режим выплат: {game.rules.rewardDistributionMode === "split_pool" ? "делить банк" : "полная выплата каждому"}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
