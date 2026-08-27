import { Box, Card, CardContent, MenuItem, Select, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { AnalyticsPlayerDetails } from "../types";
import { formatNumber, pluralizeRu } from "./analyticsFormat";
import { sourceLabels } from "./AnalyticsFilters";
import AnalyticsRewardsChart from "./AnalyticsRewardsChart";

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

interface AnalyticsPlayerWorkspaceProps {
  details: AnalyticsPlayerDetails;
  onResourceChange: (resourceId: string) => void;
  onShowMoreHistory: () => void;
  isLoadingHistory: boolean;
}

export default function AnalyticsPlayerWorkspace({
  details,
  onResourceChange,
  onShowMoreHistory,
  isLoadingHistory,
}: AnalyticsPlayerWorkspaceProps) {
  const resourceById = new Map(details.rewardsByResource.map((entry) => [entry.resource.id, entry.resource]));

  return (
    <Stack spacing={2}>
      <AppResponsiveGrid columns={{ xs: 1, lg: 2 }} gap={2}>
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <PanelHeader title="Награды по дням" description="Когда игрок зарабатывал выбранный ресурс." details={details} onResourceChange={onResourceChange} />
            <AnalyticsRewardsChart playerDetails={details} />
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <PanelHeader title="Откуда получены награды" description="Распределение заработка по типам проведений." details={details} onResourceChange={onResourceChange} />
            <SourceDistribution details={details} />
          </CardContent>
        </Card>
      </AppResponsiveGrid>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <PanelHeader title="Позиции по игровым форматам" description="Место игрока среди участников каждого типа проведений по выбранному ресурсу." details={details} onResourceChange={onResourceChange} />
          <Stack spacing={1}>
            {details.positionsBySourceType.map((position) => (
              <Box key={position.sourceType} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: "minmax(0, 1fr) 112px 112px" }, gap: 1.5, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.control, px: 1.5, py: 1.25 }}>
                <Box minWidth={0}>
                  <Typography variant="subtitle2">{sourceLabels[position.sourceType]}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatNumber(position.participations)} {pluralizeRu(position.participations, ["участие", "участия", "участий"])}</Typography>
                </Box>
                <Box textAlign="right"><Typography variant="subtitle2">{formatNumber(position.rewards.total)}</Typography><Typography variant="caption" color="text.secondary">{details.resource.resource.label}</Typography></Box>
                <Box textAlign="right"><Typography variant="h6" color="primary.main">{position.rank ? `#${position.rank}` : "—"}</Typography><Typography variant="caption" color="text.secondary">{position.rankedPlayers ? `из ${position.rankedPlayers} игроков` : "без наград"}</Typography></Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h5">История участий</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>Что именно игрок делал и какие награды получал.</Typography>
          {details.history.entries.length ? <Stack spacing={1}>
            {details.history.entries.map((entry) => (
              <Box key={`${entry.occurredOn}-${entry.source.titleSnapshot}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", md: "112px minmax(0, 1fr) auto" }, gap: 1.5, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: (theme) => theme.customRadii.control, px: 1.5, py: 1.25 }}>
                <Typography variant="caption" color="text.secondary">{formatDate(entry.occurredOn)}</Typography>
                <Box minWidth={0}><Typography variant="subtitle2">{entry.source.titleSnapshot}</Typography><Typography variant="caption" color="text.secondary">{sourceLabels[entry.source.type]}</Typography></Box>
                <Typography variant="subtitle2" textAlign="right" color={entry.rewards.length ? "text.primary" : "text.secondary"}>
                  {entry.rewards.length ? entry.rewards.map((reward) => `+${formatNumber(reward.amount)} ${resourceById.get(reward.resourceId)?.label ?? reward.resourceId}`).join(" · ") : "Без награды"}
                </Typography>
              </Box>
            ))}
            {details.history.nextCursor ? <AppPillButton variant="outlined" loading={isLoadingHistory} onClick={onShowMoreHistory} sx={{ alignSelf: "flex-start", mt: 0.5 }}>Показать всю историю ↓</AppPillButton> : null}
          </Stack> : <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>За выбранный период участий не найдено.</Typography>}
        </CardContent>
      </Card>
    </Stack>
  );
}

function PanelHeader({ title, description, details, onResourceChange }: { title: string; description: string; details: AnalyticsPlayerDetails; onResourceChange: (resourceId: string) => void }) {
  return <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, alignItems: "start", mb: 2.25, flexDirection: { xs: "column", sm: "row" } }}><Box><Typography variant="h5">{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography></Box><Select size="small" value={details.resource.resource.id} onChange={(event) => onResourceChange(event.target.value)} sx={{ minWidth: 180, borderRadius: (theme) => theme.customRadii.control }}>{details.rewardsByResource.map((entry) => <MenuItem key={entry.resource.id} value={entry.resource.id}>{entry.resource.name}</MenuItem>)}</Select></Box>;
}

function SourceDistribution({ details }: { details: AnalyticsPlayerDetails }) {
  const entries = Object.entries(details.rewardsBySourceType).filter(([, entry]) => entry.rewards.total > 0) as Array<[keyof typeof details.rewardsBySourceType, (typeof details.rewardsBySourceType)[keyof typeof details.rewardsBySourceType]]>;
  const total = entries.reduce((sum, [, entry]) => sum + entry.rewards.total, 0);
  const colors = ["#4f46e5", "#0891b2", "#8b5cf6", "#cbd5e1", "#f59e0b"];
  const gradient = entries.length ? entries.reduce(({ parts, offset }, [, entry], index) => ({ parts: [...parts, `${colors[index]} ${offset}% ${offset + (entry.rewards.total / total) * 100}%`], offset: offset + (entry.rewards.total / total) * 100 }), { parts: [] as string[], offset: 0 }).parts.join(", ") : "#e2e8f0 0 100%";
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr)" }, gap: 2, alignItems: "center", minHeight: 248 }}><Box sx={{ width: 170, height: 170, mx: "auto", borderRadius: "50%", background: `conic-gradient(${gradient})`, display: "grid", placeItems: "center" }}><Box sx={{ width: 102, height: 102, borderRadius: "50%", bgcolor: "background.paper", display: "grid", placeItems: "center", textAlign: "center" }}><Typography variant="h5">{formatNumber(total)}<Typography component="span" variant="caption" display="block" color="text.secondary">{details.resource.resource.label}</Typography></Typography></Box></Box><Stack spacing={1}>{entries.map(([sourceType, entry], index) => <Box key={sourceType} sx={{ display: "grid", gridTemplateColumns: "10px minmax(0, 1fr) auto", gap: 1, alignItems: "center" }}><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colors[index] }} /><Typography variant="body2">{sourceLabels[sourceType]} · {Math.round((entry.rewards.total / total) * 100)}%</Typography><Typography variant="subtitle2">{formatNumber(entry.rewards.total)}</Typography></Box>)}</Stack></Box>;
}
