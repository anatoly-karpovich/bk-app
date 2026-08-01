export function collectResourceIdsFromRules(rules: unknown): Set<string> {
  const resourceIds = new Set<string>();
  const visited = new Set<unknown>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) return void value.forEach(visit);
    const record = value as Record<string, unknown>;
    if (typeof record.resourceId === "string") resourceIds.add(record.resourceId);
    Object.values(record).forEach(visit);
  };
  visit(rules);
  return resourceIds;
}
