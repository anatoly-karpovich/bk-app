import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Card, CardContent, CardHeader, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AddPlayerButton from "../../../components/AddPlayerButton";
import GameStartButton from "../../../components/GameStartButton";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import type { LottoBingoPlayer } from "../types";

interface Props {
  players: LottoBingoPlayer[];
  playerName: string;
  busy: boolean;
  canAddPlayer: boolean;
  canRemovePlayer: boolean;
  canStart: boolean;
  onPlayerNameChange: (next: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (player: LottoBingoPlayer) => void;
  onStart: () => void;
}

export default function LottoBingoRegistrationPanel({ players, playerName, busy, canAddPlayer, canRemovePlayer, canStart, onPlayerNameChange, onAddPlayer, onRemovePlayer, onStart }: Props) {
  return (
    <Card sx={{ alignSelf: "start" }}>
      <CardHeader
        title="Регистрация игроков"
        subheader="Билет создаётся сразу после добавления игрока."
        sx={{ pb: 0, "& .MuiCardHeader-action": { mr: 0, mt: 0.5 } }}
        action={<GameStartButton label="Начать игру" startIcon={<PlayArrowRoundedIcon />} disabled={busy || !canStart} loading={busy} onClick={onStart} />}
      />
      <CardContent sx={{ px: { xs: 2.25, md: 2.5 }, pt: 2, pb: { xs: 2.25, md: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <GamePlayerNameInput label="Ник игрока" value={playerName} onChange={onPlayerNameChange} disabled={busy || !canAddPlayer} helperTextMode="hidden" placeholder="Ник игрока" />
          </Box>
          <AddPlayerButton variant="contained" disabled={busy || !canAddPlayer || !playerName.trim()} onClick={onAddPlayer} sx={{ minWidth: { sm: 140 } }} />
        </Stack>
        <Stack spacing={1} sx={{ mt: 1.75 }}>
          {players.map((player) => <Box key={player.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, px: 1.5, py: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5, bgcolor: "background.paper" }}>
            <Typography fontWeight={700} noWrap>{player.nickname} <Typography component="span" fontWeight={400}>· билет №{player.ticket.number}</Typography></Typography>
            {canRemovePlayer ? <Tooltip title="Удалить игрока"><span><IconButton aria-label={`Удалить игрока ${player.nickname}`} color="error" disabled={busy} onClick={() => onRemovePlayer(player)}><DeleteOutlineRoundedIcon /></IconButton></span></Tooltip> : null}
          </Box>)}
          {!players.length ? <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>Добавьте первого игрока, чтобы выдать билет.</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
