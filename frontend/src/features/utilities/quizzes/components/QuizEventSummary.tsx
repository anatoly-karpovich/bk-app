import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../../components/ui/AppPillButton";
import AppTextInput from "../../../../components/ui/AppTextInput";
import { formatResourceAmounts } from "../../../rewards/resourceAmounts";
import type { QuizEvent } from "../types";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

export default function QuizEventSummary({ event }: { event: QuizEvent }) {
  if (!event.summary) return null;
  const summary = event.summary;
  const summaryText = summary.players.map((player) => `${player.playerName} — ${formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "без награды"}`).join("\n");
  return <Card><CardContent><Stack spacing={1.25}><Typography variant="h5">Итоги проведения</Typography><Typography variant="body2" color="text.secondary">Подготовлено: {event.preparedQuestionsCount}; проведено: {event.conductedQuestionsCount}; проверено: {event.reviewedQuestionsCount}.</Typography><Table size="small"><TableHead><TableRow><TableCell>Игрок</TableCell><TableCell align="right">Верных</TableCell><TableCell>Обычные</TableCell><TableCell>Бонусы</TableCell><TableCell>Итого</TableCell></TableRow></TableHead><TableBody>{summary.players.map((player) => <TableRow key={player.playerName}><TableCell>{player.playerName}</TableCell><TableCell align="right">{player.correctAnswers}</TableCell><TableCell>{formatResourceAmounts(player.regularRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.bonusRewards, event.quizSnapshot.resources) || "—"}</TableCell><TableCell>{formatResourceAmounts(player.totalRewards, event.quizSnapshot.resources) || "—"}</TableCell></TableRow>)}</TableBody></Table><AppTextInput multiline minRows={5} label="Для администрации" value={summaryText} InputProps={{ readOnly: true }} /><AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(summaryText)} sx={{ alignSelf: "flex-start" }}>Копировать ведомость</AppPillButton></Stack></CardContent></Card>;
}
