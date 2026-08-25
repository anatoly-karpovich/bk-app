/** Shared reward-resource series palette so summary chips and charts stay visually in sync. */
export const RESOURCE_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
  "#10b981",
] as const;

export function getResourceColor(index: number): string {
  return RESOURCE_COLORS[index % RESOURCE_COLORS.length];
}
