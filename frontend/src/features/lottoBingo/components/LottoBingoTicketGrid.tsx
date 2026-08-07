import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import GameActionButton from "../../../components/GameActionButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";

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
}

export default function LottoBingoTicketGrid({ players, candidates, canDisqualify, canRestore, canRemove, disabled, onDisqualify, onRestore, onRemove }: Props) {
  const candidatesByPlayer = new Map(candidates.map((candidate) => [candidate.playerId, candidate]));
  return <AppResponsiveGrid columns={{ xs: 1, md: 2, xl: 3 }} gap={2.25}>
    {players.map((player) => {
      const candidate = candidatesByPlayer.get(player.id);
      const highlightedRows = new Set(candidate?.matchedAreas.flatMap((area) => area.rowIndexes) ?? []);
      return <Card key={player.id} sx={{ opacity: player.status === "disqualified" ? 0.62 : 1 }}><CardContent><Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start"><Box><Typography variant="h6">#{player.ticket.number} · {player.nickname}</Typography><Typography variant="caption" color="text.secondary">Закрыто: {player.progress.matchedCount} · осталось: {player.progress.remainingCount}</Typography></Box><Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">{candidate ? <Chip size="small" color="warning" label="Кандидат" /> : null}{player.status === "round_winner" ? <Chip size="small" color="success" label="Победитель" /> : null}{player.status === "disqualified" ? <Chip size="small" color="error" label="Дисквалифицирован" /> : null}</Stack></Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0, 1fr))", gap: 0.4 }}>
          {player.ticket.grid.flatMap((row, rowIndex) => row.map((value, columnIndex) => <Box key={`${rowIndex}-${columnIndex}`} sx={{ minHeight: 30, display: "grid", placeItems: "center", borderRadius: 1, fontWeight: value !== null ? 700 : 400, bgcolor: value === null ? "rgba(15,23,42,0.035)" : player.progress.matchedNumbers.includes(value) ? highlightedRows.has(rowIndex) ? "success.light" : "primary.light" : "rgba(248,250,252,0.9)", color: value === null ? "transparent" : "text.primary", border: highlightedRows.has(rowIndex) ? "1px solid" : "1px solid transparent", borderColor: highlightedRows.has(rowIndex) ? "success.main" : "transparent" }}>{value ?? "·"}</Box>))}
        </Box>
        {player.award ? <Typography variant="body2" color="text.secondary">Награда сохранена: {player.award.type === "round" ? `раунд ${player.award.round}` : player.award.type === "completed_card" ? "заполненный билет" : "утешительная"}.</Typography> : null}
        {player.status === "active" && canDisqualify ? <GameActionButton label="Дисквалифицировать" icon={<BlockRoundedIcon />} disabled={disabled} onClick={() => onDisqualify(player)} /> : null}
        {canRemove ? <GameActionButton label="Удалить игрока" icon={<DeleteOutlineRoundedIcon />} disabled={disabled} onClick={() => onRemove(player)} /> : null}
        {player.status === "disqualified" && canRestore ? <GameActionButton label="Восстановить" icon={<RestoreRoundedIcon />} disabled={disabled} onClick={() => onRestore(player)} /> : null}
      </Stack></CardContent></Card>;
    })}
  </AppResponsiveGrid>;
}
