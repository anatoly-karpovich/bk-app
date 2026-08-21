import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { Card, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";
import LottoBingoTicketArtwork from "./LottoBingoTicketArtwork";

interface Props {
  players: LottoBingoPlayer[];
  candidates: LottoBingoCandidate[];
  canDisqualify: boolean;
  canRestore: boolean;
  canRemove: boolean;
  disabled: boolean;
  onDisqualify: (player: LottoBingoPlayer) => void;
  onRestore: (player: LottoBingoPlayer) => void;
  onRemove: (player: LottoBingoPlayer) => void;
  onOpen: (player: LottoBingoPlayer) => void;
  emptyMessage?: string;
}

interface TicketProps extends Omit<Props, "players" | "candidates"> {
  player: LottoBingoPlayer;
  candidate?: LottoBingoCandidate;
}

function Ticket({
  player,
  candidate,
  canDisqualify,
  canRestore,
  canRemove,
  disabled,
  onDisqualify,
  onRestore,
  onRemove,
  onOpen,
}: TicketProps) {
  const isRoundWinner = player.status === "round_winner" || player.award?.type === "round";
  const removalAction = canRemove
    ? { label: "Удалить игрока", onClick: onRemove }
    : player.status === "active" && canDisqualify
      ? { label: "Дисквалифицировать игрока", onClick: onDisqualify }
      : null;

  const stopTicketOpen = (event: React.MouseEvent<HTMLButtonElement>, callback: () => void) => {
    event.stopPropagation();
    callback();
  };

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "visible",
        cursor: "pointer",
        justifySelf: "start",
        width: "fit-content",
        maxWidth: "100%",
        p: 1.5,
        borderRadius: 0.75,
        border: "1px solid",
        borderColor: candidate ? "success.main" : isRoundWinner ? "#d5b44f" : "#dedede",
        bgcolor: isRoundWinner ? "#f4df91" : "#f2f2f2",
        opacity: player.status === "disqualified" ? 0.58 : 1,
        boxShadow: candidate ? "0 0 0 3px rgba(21,128,61,.10), 0 12px 26px rgba(21,128,61,.08)" : "none",
        transition: "box-shadow .18s ease, transform .18s ease",
        "&:hover": {
          boxShadow: candidate
            ? "0 0 0 3px rgba(21,128,61,.10), 0 12px 26px rgba(21,128,61,.08)"
            : "0 10px 24px rgba(15,23,42,.09)",
          transform: "translateY(-1px)",
        },
        "& .lotto-bingo-ticket-actions": {
          position: "absolute",
          top: 1.75,
          right: 1.75,
          zIndex: 1,
          opacity: 0,
          pointerEvents: "none",
          transform: "translateY(-4px)",
          transition: "opacity .16s ease, transform .16s ease",
        },
        "&:hover .lotto-bingo-ticket-actions, &:focus-within .lotto-bingo-ticket-actions": {
          opacity: 1,
          pointerEvents: "auto",
          transform: "translateY(0)",
        },
        "@media (hover: none)": {
          "& .lotto-bingo-ticket-actions": {
            opacity: 1,
            pointerEvents: "auto",
            transform: "translateY(0)",
          },
        },
        "&:focus-visible": {
          outline: "3px solid",
          outlineColor: "primary.light",
          outlineOffset: 3,
        },
      }}
      role="button"
      tabIndex={0}
      aria-label={`Открыть билет игрока ${player.nickname}`}
      onClick={() => onOpen(player)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onOpen(player);
      }}
    >
      <Stack className="lotto-bingo-ticket-actions" direction="row" alignItems="center" spacing={0.25}>
        {candidate ? (
          <AppChip size="small" color="warning" label="Кандидат" sx={{ fontSize: "0.61rem", height: 24 }} />
        ) : null}
        {player.status === "disqualified" ? (
          <AppChip size="small" color="error" label="Дисквалифицирован" sx={{ fontSize: "0.61rem", height: 24 }} />
        ) : null}
        {player.status === "disqualified" && canRestore ? (
          <Tooltip title="Восстановить игрока">
            <span>
              <IconButton
                aria-label={`Восстановить игрока ${player.nickname}`}
                size="small"
                disabled={disabled}
                onClick={(event) => stopTicketOpen(event, () => onRestore(player))}
              >
                <RestoreRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        {removalAction ? (
          <Tooltip title={removalAction.label}>
            <span>
              <IconButton
                aria-label={`${removalAction.label} ${player.nickname}`}
                color="error"
                size="small"
                disabled={disabled}
                onClick={(event) => stopTicketOpen(event, () => removalAction.onClick(player))}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
      <LottoBingoTicketArtwork player={player} candidate={candidate} size="workspace" />
    </Card>
  );
}

export default function LottoBingoTicketGrid({
  players,
  candidates,
  canDisqualify,
  canRestore,
  canRemove,
  disabled,
  onDisqualify,
  onRestore,
  onRemove,
  onOpen,
  emptyMessage = "Подходящих билетов не найдено.",
}: Props) {
  const candidatesByPlayer = new Map(candidates.map((candidate) => [candidate.playerId, candidate]));

  return (
    <AppResponsiveGrid
      columns={{ xs: 1 }}
      gap={2.25}
      sx={{
        mt: 0.25,
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(auto-fill, minmax(460px, 1fr))",
        },
      }}
    >
      {players.map((player) => (
        <Ticket
          key={player.id}
          player={player}
          candidate={candidatesByPlayer.get(player.id)}
          canDisqualify={canDisqualify}
          canRestore={canRestore}
          canRemove={canRemove}
          disabled={disabled}
          onDisqualify={onDisqualify}
          onRestore={onRestore}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ))}
      {!players.length ? (
        <Typography color="text.secondary" variant="body2">
          {emptyMessage}
        </Typography>
      ) : null}
    </AppResponsiveGrid>
  );
}
