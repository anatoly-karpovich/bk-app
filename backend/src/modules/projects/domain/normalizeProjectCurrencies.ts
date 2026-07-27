import type { ProjectCurrency, ProjectResource } from "./types";

export function normalizeProjectResources(
  resources: Array<Partial<ProjectResource>>,
  timestamp = new Date().toISOString(),
): ProjectResource[] {
  const ids = new Set<string>();
  const codes = new Set<string>();

  return resources.map((resource, index) => {
    const id = resource.id?.trim() || `resource_${index + 1}`;
    const code = resource.code?.trim() || id;
    const label = resource.label?.trim() || resource.name?.trim() || code;
    const name = resource.name?.trim() || label;
    const type = resource.type === "item" ? "item" : "currency";
    const valueType = "valueType" in resource && resource.valueType === "decimal" ? "decimal" : "integer";
    const precision = valueType === "decimal" ? 1 : 0;

    if (ids.has(id) || codes.has(code)) {
      throw new Error(`Project resources must have unique id and code: ${id}`);
    }

    ids.add(id);
    codes.add(code);

    const shortLabel = resource.shortLabel?.trim() || undefined;
    const unitLabel = resource.unitLabel?.trim() || undefined;

    return {
      id,
      code,
      name,
      label,
      ...(shortLabel ? { shortLabel } : {}),
      ...(unitLabel ? { unitLabel } : {}),
      type,
      ...(type === "currency" ? { valueType, precision } : {}),
      createdAt: resource.createdAt || timestamp,
      updatedAt: timestamp,
    } as ProjectResource;
  });
}

/** Offline backup scripts still use the currency-only pre-resource format. */
export function normalizeProjectCurrencies(
  currencies: Array<Partial<ProjectCurrency>>,
  timestamp = new Date().toISOString(),
): ProjectCurrency[] {
  return normalizeProjectResources(currencies.map((currency) => ({ ...currency, type: "currency" })), timestamp)
    .filter((resource): resource is ProjectCurrency => resource.type === "currency");
}
