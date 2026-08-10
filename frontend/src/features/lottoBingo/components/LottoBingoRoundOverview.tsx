import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { formatRewardPool } from "../../rewards/resourceAmounts";
import type { LottoBingoPageModel } from "../types";

const criteria = ["Одна строка", "Половина билета", "Весь билет"] as const;

export default function LottoBingoRoundOverview({ game }: { game: LottoBingoPageModel }) {
  return (
    <Card sx={{ minHeight: 250 }}>
      <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
        <Typography variant="h5">Раунды и призы</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Текущий этап и уже подтверждённые результаты.
        </Typography>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {criteria.map((criterion, index) => {
            const round = (index + 1) as 1 | 2 | 3;
            const key = `round${round}` as const;
            const winners = game.state.winners[key];
            const active = game.state.round.activeRound === round;
            const reward = formatRewardPool(game.configuration.rules.rewards[key], game.configuration.resources);

            return (
              <Box
                key={key}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(66px, .75fr) minmax(0, 1.2fr) auto",
                  alignItems: "center",
                  gap: 1,
                  p: 1.25,
                  border: "1px solid",
                  borderColor: active ? "primary.light" : "divider",
                  bgcolor: active ? "#f6f7ff" : "common.white",
                  borderRadius: (theme) => theme.customRadii.sm,
                }}
              >
                <Typography variant="caption" sx={{ color: active ? "primary.main" : "text.secondary", fontWeight: active ? 800 : 400 }}>
                  {round}-й раунд<br />{criterion}
                </Typography>
                <Typography variant="body2" fontWeight={800}>{winners.length ? winners.map((winner) => winner.nickname).join(", ") : active ? "Идёт сейчас" : "—"}</Typography>
                <Typography variant="caption" color="success.main" fontWeight={700} sx={{ textAlign: "right", maxWidth: 100 }}>{reward}</Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
