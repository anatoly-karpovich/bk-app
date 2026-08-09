import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { Box, Card, IconButton, ListItemIcon, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { useState } from "react";
import AppChip from "../../../components/ui/AppChip";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";
import LottoBingoTicketCells from "./LottoBingoTicketCells";
import LottoBingoTicketPlayerLabel from "./LottoBingoTicketPlayerLabel";

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
  const completedRows = new Set(player.progress.completedRowIndexes);
  const menuOpen = Boolean(menuAnchor);

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
        p: 1.5,
        borderRadius: 0.75,
        border: "1px solid",
        borderColor: candidate ? "success.main" : player.status === "round_winner" ? "success.light" : "#dedede",
        bgcolor: player.status === "round_winner" ? "#f7fbf8" : "#f2f2f2",
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
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
          <LottoBingoTicketPlayerLabel nickname={player.nickname} />
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            Билет №{player.ticket.number}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          {candidate ? (
            <AppChip size="small" color="warning" label="Кандидат" sx={{ fontSize: "0.61rem", height: 24 }} />
          ) : null}
          {player.status === "round_winner" ? (
            <AppChip size="small" color="success" label="Победитель" sx={{ fontSize: "0.61rem", height: 24 }} />
          ) : null}
          {player.status === "disqualified" ? (
            <AppChip size="small" color="error" label="Дисквалифицирован" sx={{ fontSize: "0.61rem", height: 24 }} />
          ) : null}
          <IconButton
            aria-label={`Действия с билетом ${player.nickname}`}
            size="small"
            disabled={disabled}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <LottoBingoTicketCells
        grid={player.ticket.grid}
        matchedNumbers={player.progress.matchedNumbers}
        candidate={candidate}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mt: 1.15 }}>
        <Typography variant="caption" color="text.secondary">
          Закрыто {player.progress.matchedCount} · осталось {player.progress.remainingCount}
        </Typography>
        <Stack direction="row" spacing={0.45}>
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: completedRows.has(index) ? "primary.main" : "#d3d6db",
              }}
            />
          ))}
        </Stack>
      </Stack>
      {player.award ? (
        <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.75 }}>
          Награда сохранена:{" "}
          {player.award.type === "round"
            ? `раунд ${player.award.round}`
            : player.award.type === "completed_card"
              ? "заполненный билет"
              : "утешительная"}
          .
        </Typography>
      ) : null}
      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={closeMenu} MenuListProps={{ dense: true }}>
        <MenuItem onClick={() => invoke(() => onOpen(player))}>
          <ListItemIcon>
            <OpenInNewRoundedIcon fontSize="small" />
          </ListItemIcon>
          Открыть билет
        </MenuItem>
        {player.status === "active" && canDisqualify ? (
          <MenuItem disabled={disabled} onClick={() => invoke(() => onDisqualify(player))}>
            <ListItemIcon>
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
    <AppResponsiveGrid columns={{ xs: 1, md: 2 }} gap={2.25} sx={{ mt: 0.25 }}>
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
