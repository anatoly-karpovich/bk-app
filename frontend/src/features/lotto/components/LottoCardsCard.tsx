import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoPersistedGame, LottoPlayer } from "../types";

interface LottoCardsCardProps {
  game: LottoPersistedGame | null;
  actionsDisabled: boolean;
  onCopyNumbers: (player: LottoPlayer) => void | Promise<void>;
  onRemovePlayer: (player: LottoPlayer) => void;
}

function getPlayerStatusLabel(player: LottoPlayer): string {
  switch (player.status) {
    case "winner_first":
      return "1 место";
    case "winner_second":
      return "2 место";
    case "removed":
      return "Исключен";
    default:
      return `Осталось ${player.remainingCount}`;
  }
}

export default function LottoCardsCard({
  game,
  actionsDisabled,
  onCopyNumbers,
  onRemovePlayer,
}: LottoCardsCardProps) {
  return (
    <Card>
      <CardHeader title={lottoTexts.cards.boardTitle} subheader={lottoTexts.cards.boardSubtitle} />
      <CardContent>
        {!game ? (
          <Alert severity="info">{lottoTexts.alerts.stateEmpty}</Alert>
        ) : (
          <Grid container spacing={2}>
            {game.players.map((player) => (
              <Grid key={player.id} item xs={12} md={6}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    opacity: player.status === "removed" ? 0.7 : 1,
                  }}
                >
                  <CardHeader
                    title={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{ cursor: "pointer" }}
                          onClick={() => onCopyNumbers(player)}
                        >
                          {player.nickname}
                        </Typography>
                        <Chip size="small" label={getPlayerStatusLabel(player)} color={player.status === "winner_first" ? "success" : player.status === "winner_second" ? "info" : player.status === "removed" ? "default" : "secondary"} />
                      </Stack>
                    }
                    action={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Скопировать числа">
                          <span>
                            <IconButton color="primary" onClick={() => onCopyNumbers(player)} disabled={actionsDisabled}>
                              <ContentCopyRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {!game.derived.gameIsOver && player.status !== "removed" ? (
                          <Tooltip title={lottoTexts.actions.removePlayer}>
                            <span>
                              <IconButton color="error" onClick={() => onRemovePlayer(player)} disabled={actionsDisabled}>
                                <DeleteOutlineRoundedIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    }
                  />
                  <CardContent>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {player.cardNumbers.map((number) => (
                        <Chip
                          key={`${player.id}-${number}`}
                          label={number}
                          color={player.matchedNumbers.includes(number) ? "success" : "default"}
                          variant={player.matchedNumbers.includes(number) ? "filled" : "outlined"}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
