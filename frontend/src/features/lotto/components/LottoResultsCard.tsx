import {
  Card,
  CardContent,
  CardHeader,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../rewards/types";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoPersistedGame } from "../types";

interface LottoResultsCardProps {
  game: LottoPersistedGame | null;
  resources: ResourceDefinition[];
}

export default function LottoResultsCard({ game, resources }: LottoResultsCardProps) {
  return (
    <Card>
      <CardHeader title={lottoTexts.cards.resultsTitle} subheader={lottoTexts.cards.resultsSubtitle} />
      <CardContent>
        {!game ? (
          <AppInfoAlert>{lottoTexts.alerts.resultsPending}</AppInfoAlert>
        ) : !game.derived.gameIsOver ? (
          <AppInfoAlert>{lottoTexts.alerts.resultsPending}</AppInfoAlert>
        ) : (
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: (theme) => theme.customRadii.md,
                whiteSpace: "pre-wrap",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Legacy summary
              </Typography>
              <Typography variant="body2">{game.derived.legacySummaryText || "Нет итоговой сводки."}</Typography>
            </Paper>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Группа</TableCell>
                    <TableCell>Игрок</TableCell>
                    <TableCell>Осталось чисел</TableCell>
                    <TableCell>Приз</TableCell>
                    <TableCell>Статус выплаты</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {game.derived.prizeTable.length ? (
                    game.derived.prizeTable.map((entry) => (
                      <TableRow key={`${entry.place}-${entry.playerId}`}>
                        <TableCell>{entry.placeLabel}</TableCell>
                        <TableCell>{entry.nickname}</TableCell>
                        <TableCell>{entry.remainingCount}</TableCell>
                        <TableCell>{formatResourceAmounts(entry.prize, resources) || "0"}</TableCell>
                        <TableCell>{entry.payoutStatus}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          Призовые группы в этой партии не определены.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
