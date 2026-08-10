import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import lottoBingoLogo from "../../../assets/lotto_bingo_logo.png";
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
        <Box
          sx={{
            bgcolor: "#e3e3e3",
            border: "1px solid",
            borderColor: "#d0d0d0",
            borderRadius: 1.25,
            p: { xs: 1.5, sm: 2.25 },
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "132px minmax(0, 1fr)" }, gap: { xs: 1.5, sm: 1.75 } }}>
            <Stack alignItems="center" spacing={0} sx={{ minWidth: 0, height: "100%" }}>
              <Box sx={{ alignSelf: "stretch" }}>
                <LottoBingoTicketPlayerLabel nickname={player.nickname} />
              </Box>
              <Stack direction="row" spacing={2.25} aria-hidden="true" sx={{ mt: 2, color: "#b8b8b8", fontSize: "1.05rem", lineHeight: 1 }}>
                <Box component="span">☆</Box>
                <Box component="span">☆</Box>
                <Box component="span">☆</Box>
              </Stack>
              <Box
                component="img"
                src={lottoBingoLogo}
                alt="Лото Бинго"
                sx={{ mt: 2.25, width: 120, height: 120, objectFit: "cover", borderRadius: "50%", boxShadow: "0 2px 5px rgba(0,0,0,.22)" }}
              />
              <Typography variant="body2" fontWeight={900} sx={{ mt: "auto", mb: 1.25, whiteSpace: "nowrap" }}>
                Билет № {player.ticket.number}
              </Typography>
            </Stack>
            <LottoBingoTicketCells
              grid={player.ticket.grid}
              matchedNumbers={player.progress.matchedNumbers}
              candidate={candidate}
              minHeight={40}
              variant="screenshot"
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
