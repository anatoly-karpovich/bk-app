import { Card, CardContent, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import LottoBingoTicketGrid from "./LottoBingoTicketGrid";
import type { LottoBingoCandidate, LottoBingoPlayer } from "../types";

type TicketFilter = "all" | "candidate" | "active" | "round_winner" | "disqualified";

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
  isRegistration?: boolean;
}

const filters: Array<{ value: TicketFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "candidate", label: "Кандидаты" },
  { value: "round_winner", label: "Победители" },
  { value: "active", label: "Активные" },
  { value: "disqualified", label: "Дисквалифицированные" },
];

export default function LottoBingoTicketsSection({ players, candidates, canDisqualify, canRestore, canRemove, disabled, onDisqualify, onRestore, onRemove, onOpen, isRegistration = false }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TicketFilter>("all");
  const candidateIds = useMemo(() => new Set(candidates.map((candidate) => candidate.playerId)), [candidates]);
  const visiblePlayers = useMemo(() => players.filter((player) => {
    const activeFilter = isRegistration ? "all" : filter;
    const matchesFilter = activeFilter === "all" || (activeFilter === "candidate" ? candidateIds.has(player.id) : player.status === activeFilter);
    return matchesFilter && player.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [candidateIds, filter, isRegistration, players, query]);

  return <Card><CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
    <Stack spacing={1.5}>
      <AppTextInput fullWidth size="small" label="Поиск игрока" placeholder="Поиск игрока" value={query} onChange={(event) => setQuery(event.target.value)} />
      {!isRegistration ? <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
        {filters.map((item) => <AppPillButton key={item.value} size="small" variant={filter === item.value ? "outlined" : "text"} color={filter === item.value ? "primary" : "inherit"} onClick={() => setFilter(item.value)} sx={{ minHeight: 32, border: "1px solid", borderColor: filter === item.value ? "primary.main" : "divider", bgcolor: filter === item.value ? "#eef2ff" : "common.white", fontSize: "0.72rem" }}>{item.label}</AppPillButton>)}
      </Stack> : null}
      <Stack spacing={0.25}><Typography variant="h5">{isRegistration ? "Выданные билеты" : "Билеты игроков"} <Typography component="span" color="text.secondary" variant="h5">({players.length})</Typography></Typography><Typography variant="caption" color="text.secondary">{isRegistration ? "Откройте билет крупно и сделайте аккуратный скрин для игрока." : "Порядок билетов сохраняется — кандидаты не «прыгают» по экрану."}</Typography></Stack>
      <LottoBingoTicketGrid players={visiblePlayers} candidates={candidates} canDisqualify={canDisqualify} canRestore={canRestore} canRemove={canRemove} disabled={disabled} onDisqualify={onDisqualify} onRestore={onRestore} onRemove={onRemove} onOpen={onOpen} emptyMessage={isRegistration ? "Выданных билетов пока нет." : undefined} />
    </Stack>
  </CardContent></Card>;
}
