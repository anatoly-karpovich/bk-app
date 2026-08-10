import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";
import LottoBingoTicketArtwork from "./LottoBingoTicketArtwork";

interface Props {
  player: LottoBingoPlayer | null;
  candidate?: LottoBingoCandidate;
  onClose: () => void;
}

export default function LottoBingoTicketDialog({ player, candidate, onClose }: Props) {
  if (!player) return null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-label={`Билет игрока ${player.nickname}`}>
      <DialogTitle sx={{ pr: 7 }}>
        Билет игрока
        <IconButton
          aria-label="Закрыть билет"
          onClick={onClose}
          sx={{ position: "absolute", right: 16, top: 12 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <LottoBingoTicketArtwork player={player} candidate={candidate} size="dialog" />
      </DialogContent>
    </Dialog>
  );
}
