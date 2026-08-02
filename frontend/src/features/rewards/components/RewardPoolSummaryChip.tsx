import { Tooltip } from "@mui/material";
import type { ChipProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import AppChip from "../../../components/ui/AppChip";
import { rewardTexts } from "../../../texts/rewardTexts";
import { formatResourceAmounts, formatRewardPool } from "../resourceAmounts";
import type { ResourceDefinition, RewardPool } from "../types";

interface RewardPoolSummaryChipProps {
  pool: RewardPool | undefined;
  resources: readonly ResourceDefinition[];
  color?: ChipProps["color"];
  size?: ChipProps["size"];
  sx?: SxProps<Theme>;
}

function getSummary(pool: RewardPool | undefined, resources: readonly ResourceDefinition[]) {
  if (!pool) {
    return { label: rewardTexts.empty, details: rewardTexts.empty };
  }

  if (pool.mode === "all") {
    if (!pool.rewards.length) {
      return { label: rewardTexts.empty, details: rewardTexts.empty };
    }

    if (pool.rewards.length === 1) {
      return {
        label: formatResourceAmounts(pool.rewards, resources, { showPlus: true }),
        details: formatRewardPool(pool, resources),
      };
    }

    return { label: rewardTexts.rewardsCount(pool.rewards.length), details: formatRewardPool(pool, resources) };
  }

  if (pool.mode === "weighted_one") {
    return { label: rewardTexts.variantsCount(pool.options.length), details: formatRewardPool(pool, resources) };
  }

  return { label: rewardTexts.chancesCount(pool.options.length), details: formatRewardPool(pool, resources) };
}

export default function RewardPoolSummaryChip({
  pool,
  resources,
  color = "default",
  size = "small",
  sx,
}: RewardPoolSummaryChipProps) {
  const summary = getSummary(pool, resources);

  return (
    <Tooltip title={summary.details} arrow>
      <span>
        <AppChip size={size} label={summary.label} color={color} sx={sx} />
      </span>
    </Tooltip>
  );
}
