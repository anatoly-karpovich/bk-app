import type { CurrencySnapshot } from "../../../common/currency";
import type { Resource, ResourceAmount, ResourceLimit, ResourceSnapshot } from "./reward.types";

export function getCurrencySnapshots(resources: readonly ResourceSnapshot[]): CurrencySnapshot[] {
  return resources
    .filter((resource): resource is Extract<ResourceSnapshot, { type: "currency" }> => resource.type === "currency")
    .map(({ type: _type, unitLabel: _unitLabel, ...currency }) => ({ ...currency }));
}

export function getResourceById(resources: readonly Resource[], resourceId: string): Resource | undefined {
  return resources.find((resource) => resource.id === resourceId);
}

export function assertValidResourceAmount(reward: ResourceAmount, resourcesById: ReadonlyMap<string, Resource>): void {
  const resource = resourcesById.get(reward.resourceId);
  if (!resource) throw new Error(`Unknown project resource \"${reward.resourceId}\"`);
  if (!Number.isFinite(reward.amount) || reward.amount === 0) throw new Error(`Resource amount for \"${reward.resourceId}\" must be finite and non-zero`);
  if (resource.type === "item" && (!Number.isSafeInteger(reward.amount) || reward.amount < 0)) {
    throw new Error(`Item amount for \"${reward.resourceId}\" must be a positive integer`);
  }
  if (resource.type === "currency" && !Number.isInteger(reward.amount * 10 ** resource.precision)) {
    throw new Error(`Currency amount for \"${reward.resourceId}\" exceeds precision ${resource.precision}`);
  }
}

export function assertValidResourceLimits(limits: readonly ResourceLimit[], resourcesById: ReadonlyMap<string, Resource>): void {
  const ids = new Set<string>();
  limits.forEach((limit) => {
    if (ids.has(limit.resourceId)) throw new Error(`Duplicate resource limit for \"${limit.resourceId}\"`);
    ids.add(limit.resourceId);
    const resource = resourcesById.get(limit.resourceId);
    if (!resource) throw new Error(`Unknown project resource \"${limit.resourceId}\"`);
    [limit.min, limit.max].filter((value): value is number => value !== undefined).forEach((value) => {
      if (!Number.isFinite(value) || value < 0) throw new Error(`Resource limit for \"${limit.resourceId}\" must be non-negative`);
      if (resource.type === "item" && !Number.isSafeInteger(value)) throw new Error(`Item limit for \"${limit.resourceId}\" must be an integer`);
      if (resource.type === "currency" && !Number.isInteger(value * 10 ** resource.precision)) {
        throw new Error(`Currency limit for \"${limit.resourceId}\" exceeds precision ${resource.precision}`);
      }
    });
    if (limit.min !== undefined && limit.max !== undefined && limit.min > limit.max) {
      throw new Error(`Resource limit for \"${limit.resourceId}\" has min greater than max`);
    }
  });
}
