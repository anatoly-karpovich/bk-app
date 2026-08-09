import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Box, Card, CardContent, Checkbox, Stack, Typography } from "@mui/material";
import GameActionButton from "../../../components/GameActionButton";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { getCandidateDescription } from "../lottoBingo.helpers";
import type { LottoBingoPageModel } from "../types";

interface Props {
  game: LottoBingoPageModel;
  busy: boolean;
  selectedWinnerIds: string[];
  onSelectedWinnerIdsChange: (next: string[]) => void;
  onConfirm: () => void;
}

export default function LottoBingoCandidatePanel({ game, busy, selectedWinnerIds, onSelectedWinnerIdsChange, onConfirm }: Props) {
  const { candidates } = game.state.round;
  const { access } = game.meta;
  const toggleCandidate = (playerId: string, checked: boolean) =>
    onSelectedWinnerIdsChange(checked ? [...selectedWinnerIds, playerId] : selectedWinnerIds.filter((id) => id !== playerId));

  return (
    <Card sx={{ gridColumn: { lg: "span 2" }, minHeight: 250 }}>
      <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
          <Box>
            <Typography variant="h5">Кандидаты текущего раунда</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Игроки, которые уже выполнили условие раунда.
            </Typography>
          </Box>
          <AppChip size="small" color={candidates.length ? "warning" : "default"} label={`${candidates.length} ${candidates.length === 1 ? "кандидат" : "кандидата"}`} />
        </Stack>
        {candidates.length ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {candidates.map((candidate) => {
              const checked = selectedWinnerIds.includes(candidate.playerId);
              return (
                <Box
                  key={candidate.playerId}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 1,
                    border: "1px solid",
                    borderColor: checked ? "success.main" : "divider",
                    borderRadius: (theme) => theme.customRadii.sm,
                    px: 1,
                    py: 1,
                    bgcolor: checked ? "#f7fee7" : "common.white",
                    boxShadow: checked ? "0 0 0 3px rgba(132,204,22,.10)" : "none",
                  }}
                >
                  <Checkbox size="small" checked={checked} disabled={busy || !access.canConfirmWinner} onChange={(_, next) => toggleCandidate(candidate.playerId, next)} />
                  <Box>
                    <Typography fontWeight={800}>
                      {candidate.nickname} <Typography component="span" color="text.secondary" fontWeight={500}>· билет №{game.state.players.find((player) => player.id === candidate.playerId)?.ticket.number ?? "—"}</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{getCandidateDescription(candidate)}</Typography>
                  </Box>
                  <AppChip size="small" label={`с бочонка ${candidate.eligibleSinceDraw}`} sx={{ bgcolor: "#eef8f0", color: "#496055" }} />
                </Box>
              );
            })}
            <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 0.75 }}>
              <GameActionButton label="Подтвердить победителей" icon={<CheckCircleRoundedIcon />} disabled={busy || !access.canConfirmWinner || !selectedWinnerIds.length} onClick={onConfirm} variant="contained" />
            </Box>
          </Stack>
        ) : (
          <AppInfoAlert sx={{ mt: 2 }}>Подходящих кандидатов сейчас нет. Можно продолжать тираж.</AppInfoAlert>
        )}
      </CardContent>
    </Card>
  );
}
