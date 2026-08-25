import type { AnalyticsOverview, AnalyticsPlayerDetails, AnalyticsResources } from "../types";
import { getResourceColor } from "./analyticsColors";
import { formatNumber, pluralizeRu } from "./analyticsFormat";
import type { AnalyticsSummaryChip } from "./AnalyticsSummaryChips";

function resourceChips(
  entries: Array<{ resource: { id: string; label: string }; rewards: { total: number } }>,
): AnalyticsSummaryChip[] {
  return entries
    .filter((entry) => entry.rewards.total !== 0)
    .map((entry, index) => ({
      key: entry.resource.id,
      color: getResourceColor(index),
      label: `${formatNumber(entry.rewards.total)} ${entry.resource.label}`,
    }));
}

export function buildOverviewSummary(
  overview: AnalyticsOverview,
  resources: AnalyticsResources,
): AnalyticsSummaryChip[] {
  return [
    {
      key: "sources",
      label: `${formatNumber(overview.conductedSources)} ${pluralizeRu(overview.conductedSources, ["проведение", "проведения", "проведений"])}`,
    },
    {
      key: "players",
      label: `${formatNumber(overview.uniqueResolvedPlayers)} ${pluralizeRu(overview.uniqueResolvedPlayers, ["игрок", "игрока", "игроков"])}`,
    },
    ...resourceChips(resources.resources),
  ];
}

export function buildPlayerSummary(details: AnalyticsPlayerDetails): AnalyticsSummaryChip[] {
  return [
    {
      key: "participations",
      label: `${formatNumber(details.participations)} ${pluralizeRu(details.participations, ["участие", "участия", "участий"])}`,
    },
    ...resourceChips(details.rewardsByResource),
  ];
}
