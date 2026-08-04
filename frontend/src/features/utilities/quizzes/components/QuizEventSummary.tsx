import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Box, Card, CardContent, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { QuizEvent } from "../types";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

export default function QuizEventSummary({ event }: { event: QuizEvent }) {
  if (!event.summary) return null;
  const summary = event.summary;
  const summaryText = summary.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n");

  return (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack spacing={2.25}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Итоги проведения</Typography>
              <Typography variant="body2" color="text.secondary">Проверено {event.reviewedQuestionsCount} из {event.conductedQuestionsCount} проведённых вопросов.</Typography>
            </Stack>
            <AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)}>Копировать ведомость</AppPillButton>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            {[
              [event.preparedQuestionsCount, "подготовлено"],
              [event.conductedQuestionsCount, "проведено"],
              [event.reviewedQuestionsCount, "проверено"],
            ].map(([value, label]) => (
              <Box key={label as string} sx={{ flex: 1, p: 1.75, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "#fafbfc" }}>
                <Typography variant="h5">{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Stack>

          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell>Игрок</TableCell>
                  <TableCell align="right">Верных</TableCell>
                  <TableCell>Обычные</TableCell>
                  <TableCell>Бонусы</TableCell>
                  <TableCell>Итого</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.players.map((player) => (
                  <TableRow key={player.playerName} hover>
                    <TableCell>{player.playerName}</TableCell>
                    <TableCell align="right">{player.correctAnswers}</TableCell>
                    <TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell>
                    <TableCell sx={{ color: "#a56f00", fontWeight: 700 }}>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}
