import type { ResourceAmount, ResourceSnapshot } from "../../rewards";

interface RewardApplicationEntry {
  resource: RewardResourceView;
  resolvedAmount: number;
  appliedAmount: number;
}

interface RewardResourceView {
  id: string;
  label: string;
}

export interface FormattedRewardApplication {
  resolvedGain: string | null;
  resolvedLoss: string | null;
  gained: string | null;
  lost: string | null;
  unappliedGain: string | null;
  unappliedLoss: string | null;
}

/** Formats the resource-level outcome of one Journey reward event. */
export class JourneyRewardCommentFormatter {
  format(
    resources: readonly ResourceSnapshot[],
    resolvedRewards: readonly ResourceAmount[],
    appliedRewards: readonly ResourceAmount[],
  ): FormattedRewardApplication {
    const entries = this.toEntries(resources, resolvedRewards, appliedRewards);

    return {
      resolvedGain: this.joinResourceAmounts(
        entries.flatMap((entry) =>
          entry.resolvedAmount > 0 ? [{ resource: entry.resource, amount: entry.resolvedAmount }] : [],
        ),
      ),
      resolvedLoss: this.joinResourceAmounts(
        entries.flatMap((entry) =>
          entry.resolvedAmount < 0 ? [{ resource: entry.resource, amount: entry.resolvedAmount }] : [],
        ),
      ),
      gained: this.joinResourceAmounts(
        entries.flatMap((entry) =>
          entry.appliedAmount > 0 ? [{ resource: entry.resource, amount: entry.appliedAmount }] : [],
        ),
      ),
      lost: this.joinResourceAmounts(
        entries.flatMap((entry) =>
          entry.appliedAmount < 0 ? [{ resource: entry.resource, amount: entry.appliedAmount }] : [],
        ),
      ),
      unappliedGain: this.joinResourceAmounts(
        entries.flatMap((entry) => {
          const amount = Math.max(0, entry.resolvedAmount - Math.max(0, entry.appliedAmount));
          return amount > 0 ? [{ resource: entry.resource, amount }] : [];
        }),
      ),
      unappliedLoss: this.joinResourceAmounts(
        entries.flatMap((entry) => {
          const amount = Math.max(
            0,
            Math.abs(Math.min(0, entry.resolvedAmount)) - Math.abs(Math.min(0, entry.appliedAmount)),
          );
          return amount > 0 ? [{ resource: entry.resource, amount }] : [];
        }),
      ),
    };
  }

  private toEntries(
    resources: readonly ResourceSnapshot[],
    resolvedRewards: readonly ResourceAmount[],
    appliedRewards: readonly ResourceAmount[],
  ): RewardApplicationEntry[] {
    const resolvedByResource = this.aggregateRewards(resolvedRewards);
    const appliedByResource = this.aggregateRewards(appliedRewards);
    const resourceIds = [...new Set([...resolvedByResource.keys(), ...appliedByResource.keys()])];

    return resourceIds.map((resourceId) => ({
      resource: this.toResourceView(
        resources.find((resource) => resource.id === resourceId),
        resourceId,
      ),
      resolvedAmount: resolvedByResource.get(resourceId) ?? 0,
      appliedAmount: appliedByResource.get(resourceId) ?? 0,
    }));
  }

  private aggregateRewards(rewards: readonly ResourceAmount[]): Map<string, number> {
    return rewards.reduce((result, reward) => {
      result.set(reward.resourceId, (result.get(reward.resourceId) ?? 0) + reward.amount);
      return result;
    }, new Map<string, number>());
  }

  private toResourceView(resource: ResourceSnapshot | undefined, resourceId: string): RewardResourceView {
    return {
      id: resourceId,
      label: resource?.unitLabel ?? resource?.shortLabel ?? resource?.label ?? resource?.name ?? resourceId,
    };
  }

  private joinResourceAmounts(entries: ReadonlyArray<{ resource: RewardResourceView; amount: number }>): string | null {
    const labels = entries.map((entry) => this.formatResourceAmount(entry.resource, entry.amount));
    if (!labels.length) return null;
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} и ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")} и ${labels.at(-1)}`;
  }

  private formatResourceAmount(resource: RewardResourceView, amount: number): string {
    return `${Math.abs(amount)} ${resource.label}`;
  }
}
