import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";
import LottoBingoTicketCells from "./LottoBingoTicketCells";
import LottoBingoTicketPlayerLabel from "./LottoBingoTicketPlayerLabel";

interface Props {
  player: LottoBingoPlayer | null;
  candidate?: LottoBingoCandidate;
  onClose: () => void;
}

export default function LottoBingoTicketDialog({ player, candidate, onClose }: Props) {
  if (!player) return null;

  return <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-label={`Билет игрока ${player.nickname}`}>
    <DialogTitle sx={{ pr: 7 }}>Билет игрока
      <IconButton aria-label="Закрыть билет" onClick={onClose} sx={{ position: "absolute", right: 16, top: 12 }}><CloseRoundedIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <Box sx={{ bgcolor: "#ececec", border: "1px solid", borderColor: "#d5d5d5", borderRadius: 0.75, p: { xs: 1.5, sm: 2.25 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <LottoBingoTicketPlayerLabel nickname={player.nickname} />
            <Typography variant="body2" fontWeight={800} color="text.secondary">Билет №{player.ticket.number}</Typography>
          </Stack>
          <LottoBingoTicketCells grid={player.ticket.grid} matchedNumbers={player.progress.matchedNumbers} candidate={candidate} minHeight={44} />
        </Stack>
      </Box>
    </DialogContent>
  </Dialog>;
}
