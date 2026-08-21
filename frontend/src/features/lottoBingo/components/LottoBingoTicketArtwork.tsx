import { Box, Stack, Typography } from "@mui/material";
import lottoBingoLogo from "../../../assets/lotto_bingo_logo.png";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";
import LottoBingoTicketCells from "./LottoBingoTicketCells";
import LottoBingoTicketPlayerLabel from "./LottoBingoTicketPlayerLabel";

interface Props {
  player: LottoBingoPlayer;
  candidate?: LottoBingoCandidate;
  size: "dialog" | "workspace";
}

export default function LottoBingoTicketArtwork({ player, candidate, size }: Props) {
  const isDialog = size === "dialog";
  const wonRound = player.award?.type === "round" ? player.award.round : null;
  const isRoundWinner = player.status === "round_winner" || wonRound !== null;

  return (
    <Box
      sx={{
        bgcolor: isRoundWinner ? "#efd780" : "#e3e3e3",
        border: "1px solid",
        borderColor: isRoundWinner ? "#d5b44f" : "#d0d0d0",
        borderRadius: 0.75,
        p: isDialog ? { xs: 1.5, sm: 2.25 } : 1.25,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
        width: "fit-content",
        maxWidth: "100%",
        mx: isDialog ? "auto" : undefined,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `${isDialog ? 120 : 100}px auto`,
          gap: isDialog ? 1 : 1.25,
          width: "fit-content",
        }}
      >
        <Stack alignItems="center" spacing={0} sx={{ minWidth: 0, height: "100%" }}>
          <Box sx={{ alignSelf: "stretch" }}>
            <LottoBingoTicketPlayerLabel nickname={player.nickname} fullWidth />
          </Box>
          <Stack
            direction="row"
            spacing={isDialog ? 2.25 : 1.45}
            aria-hidden="true"
            sx={{ mt: isDialog ? 2 : 1.25, fontSize: isDialog ? "1.05rem" : "0.8rem", lineHeight: 1 }}
          >
            {[1, 2, 3].map((round) => (
              <Box
                key={round}
                component="span"
                sx={{ color: wonRound !== null && round <= wonRound ? "#bd302b" : "#b8b8b8" }}
              >
                {wonRound !== null && round <= wonRound ? "★" : "☆"}
              </Box>
            ))}
          </Stack>
          <Box
            component="img"
            src={lottoBingoLogo}
            alt="Лото Бинго"
            sx={{
              mt: isDialog ? 2.25 : 1.5,
              width: isDialog ? 120 : 76,
              height: isDialog ? 120 : 76,
              objectFit: "cover",
              borderRadius: "50%",
              boxShadow: "0 2px 5px rgba(0,0,0,.22)",
            }}
          />
          <Typography
            variant={isDialog ? "body2" : "caption"}
            fontWeight={900}
            sx={{ mt: "auto", mb: isDialog ? 1.25 : 0.5, whiteSpace: "nowrap" }}
          >
            Билет № {player.ticket.number}
          </Typography>
        </Stack>
        <LottoBingoTicketCells
          grid={player.ticket.grid}
          matchedNumbers={player.progress.matchedNumbers}
          candidate={candidate}
          winner={isRoundWinner}
          minHeight={isDialog ? 40 : 30}
          variant="screenshot"
        />
      </Box>
    </Box>
  );
}
