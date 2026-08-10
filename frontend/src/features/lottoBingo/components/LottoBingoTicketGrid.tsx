import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { Card, IconButton, ListItemIcon, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { useState } from "react";
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);
  const isRoundWinner = player.status === "round_winner" || player.award?.type === "round";

  const closeMenu = () => setMenuAnchor(null);
  const invoke = (callback: () => void) => {
    closeMenu();
    callback();
  };

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "visible",
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
      }}
    >
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.25} sx={{ minHeight: 28, mb: 1 }}>
        {candidate ? <AppChip size="small" color="warning" label="Кандидат" sx={{ fontSize: "0.61rem", height: 24 }} /> : null}
        {player.status === "disqualified" ? <AppChip size="small" color="error" label="Дисквалифицирован" sx={{ fontSize: "0.61rem", height: 24 }} /> : null}
        <IconButton
          aria-label={`Действия с билетом ${player.nickname}`}
          size="small"
          disabled={disabled}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <LottoBingoTicketArtwork player={player} candidate={candidate} size="workspace" />
      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={closeMenu} MenuListProps={{ dense: true }}>
        <MenuItem onClick={() => invoke(() => onOpen(player))}>
          <ListItemIcon>
            <OpenInNewRoundedIcon fontSize="small" />
          </ListItemIcon>
          Открыть билет
        </MenuItem>
        {player.status === "active" && canDisqualify ? (
          <MenuItem disabled={disabled} onClick={() => invoke(() => onDisqualify(player))} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}>
              <BlockRoundedIcon fontSize="small" />
            </ListItemIcon>
            Дисквалифицировать
          </MenuItem>
        ) : null}
        {player.status === "disqualified" && canRestore ? (
          <MenuItem disabled={disabled} onClick={() => invoke(() => onRestore(player))}>
            <ListItemIcon>
              <RestoreRoundedIcon fontSize="small" />
            </ListItemIcon>
            Восстановить
          </MenuItem>
        ) : null}
        {canRemove ? (
          <MenuItem disabled={disabled} onClick={() => invoke(() => onRemove(player))} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            Удалить игрока
          </MenuItem>
        ) : null}
      </Menu>
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
