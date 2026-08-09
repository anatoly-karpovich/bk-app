import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Card, CardContent, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import type { LottoBingoPageModel, LottoBingoPlayer } from "../types";

function getAwardLabel(player: LottoBingoPlayer): string {
  if (player.award?.type === "round") return `Победитель ${player.award.round}-го раунда`;
  if (player.award?.type === "completed_card") return "Полный билет";
  if (player.award?.type === "consolation") return "Утешительная награда";
  if (player.status === "disqualified") return "Дисквалифицирован";
  return "Без награды";
}

function getRewardLabel(player: LottoBingoPlayer, game: LottoBingoPageModel): string {
  return player.award ? formatResourceAmounts(player.award.rewards, game.configuration.resources, { showPlus: true }) || "—" : "—";
}

function getRewardTotal(player: LottoBingoPlayer): number {
  return player.award?.rewards.reduce((total, reward) => total + reward.amount, 0) ?? 0;
}

export default function LottoBingoFinalSummary({ game }: { game: LottoBingoPageModel }) {
  const players = [...game.state.players].sort((left, right) => {
    const rewardsDifference = getRewardTotal(right) - getRewardTotal(left);
    return rewardsDifference || left.ticket.number - right.ticket.number;
  });
  const rewardedPlayersCount = players.filter((player) => player.award?.rewards.length).length;
  const summaryText = players
    .map((player) => `${player.nickname} — ${formatResourceAmounts(player.award?.rewards ?? [], game.configuration.resources) || "без награды"}`)
    .join("\n");

  return (
    <Card sx={{ gridColumn: { lg: "span 2" }, minHeight: 250 }}>
      <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Итоги и награды игроков</Typography>
              <Typography variant="body2" color="text.secondary">Финальная ведомость по всем участникам игры.</Typography>
            </Stack>
            <AppPillButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => void navigator.clipboard?.writeText(summaryText)}>
              Копировать ведомость
            </AppPillButton>
          </Stack>

          <Typography variant="body2" color="text.secondary">Игроков: {game.state.players.length} · с наградами: {rewardedPlayersCount}</Typography>

          <TableContainer
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: (theme) => theme.customRadii.surface,
              overflow: "auto",
            }}
          >
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell>Игрок</TableCell>
                  <TableCell>Результат</TableCell>
                  <TableCell align="right">Итого</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{player.nickname}</Typography>
                      <Typography variant="caption" color="text.secondary">Билет №{player.ticket.number}</Typography>
                    </TableCell>
                    <TableCell>{getAwardLabel(player)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: player.award ? "success.main" : "text.secondary" }}>
                      {getRewardLabel(player, game)}
                    </TableCell>
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
