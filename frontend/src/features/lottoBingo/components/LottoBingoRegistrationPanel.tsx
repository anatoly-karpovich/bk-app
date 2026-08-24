import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import AddPlayerButton from "../../../components/AddPlayerButton";
import GameStartButton from "../../../components/GameStartButton";
import ProjectPlayerAutocomplete from "../../../components/players/ProjectPlayerAutocomplete";
import type { PlayerReferenceInput, ProjectPlayer } from "../../players/types";
import type { LottoBingoPlayer } from "../types";

interface Props {
  players: LottoBingoPlayer[];
  player: PlayerReferenceInput;
  projectPlayers: ProjectPlayer[];
  projectPlayersLoading: boolean;
  projectPlayersError: string | null;
  busy: boolean;
  canAddPlayer: boolean;
  canStart: boolean;
  onPlayerChange: (next: PlayerReferenceInput) => void;
  onAddPlayer: () => void;
  onStart: () => void;
}

export default function LottoBingoRegistrationPanel({
  players,
  player,
  projectPlayers,
  projectPlayersLoading,
  projectPlayersError,
  busy,
  canAddPlayer,
  canStart,
  onPlayerChange,
  onAddPlayer,
  onStart,
}: Props) {
  const normalizedPlayerName = player.nickname.trim().toLocaleLowerCase();
  const isDuplicatePlayer =
    normalizedPlayerName.length > 0 &&
    players.some((player) => player.nickname.trim().toLocaleLowerCase() === normalizedPlayerName);

  return (
    <Card sx={{ alignSelf: "start" }}>
      <CardHeader
        title="Регистрация игроков"
        subheader="Билет создаётся сразу после добавления игрока."
        sx={{ pb: 0, "& .MuiCardHeader-action": { mr: 0, mt: 0.5 } }}
        action={
          <GameStartButton
            label="Начать игру"
            startIcon={<PlayArrowRoundedIcon />}
            disabled={busy || !canStart}
            loading={busy}
            onClick={onStart}
          />
        }
      />
      <CardContent sx={{ px: { xs: 2.25, md: 2.5 }, pt: 2, pb: { xs: 2.25, md: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ProjectPlayerAutocomplete
              label="Ник игрока"
              value={player}
              players={projectPlayers}
              loading={projectPlayersLoading}
              loadError={projectPlayersError}
              onChange={onPlayerChange}
              disabled={busy || !canAddPlayer}
              errorText={isDuplicatePlayer ? "Игрок уже добавлен" : null}
            />
          </Box>
          <AddPlayerButton
            variant="contained"
            disabled={busy || !canAddPlayer || !player.nickname.trim() || isDuplicatePlayer}
            onClick={onAddPlayer}
            sx={{ minWidth: { sm: 140 } }}
          />
        </Stack>
        <Stack spacing={1} sx={{ mt: 1.75 }}>
          {players.map((player) => (
            <Box
              key={player.id}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                px: 1.5,
                py: 1.1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "background.paper",
              }}
            >
              <Typography fontWeight={700} noWrap>
                {player.nickname}{" "}
                <Typography component="span" fontWeight={400}>
                  · билет №{player.ticket.number}
                </Typography>
              </Typography>
            </Box>
          ))}
          {!players.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
              Добавьте первого игрока, чтобы выдать билет.
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
