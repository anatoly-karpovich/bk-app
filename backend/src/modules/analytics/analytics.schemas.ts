import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
import { ANALYTICS_SOURCE_TYPES } from "./domain/sourceTypes";

const analyticsSourceTypeSchema = z.enum(ANALYTICS_SOURCE_TYPES);

function normalizeSourceTypes(value: unknown): unknown {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => (typeof entry === "string" ? entry.split(",").map((item) => item.trim()) : [entry]));
}

const sourceTypesQuerySchema = z.preprocess(
  normalizeSourceTypes,
  z
    .array(analyticsSourceTypeSchema)
    .min(1)
    .refine((sourceTypes) => new Set(sourceTypes).size === sourceTypes.length, "sourceTypes must be unique")
    .optional(),
);

export const analyticsProjectParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const analyticsPlayerDetailsParamsSchema = analyticsProjectParamsSchema.extend({
  playerId: objectIdSchema,
});

export const analyticsReadQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  sourceTypes: sourceTypesQuerySchema,
});

export const analyticsPlayersQuerySchema = analyticsReadQuerySchema.extend({
  resourceId: z.string().trim().min(1).max(80).optional(),
  rewardCategory: z.enum(["total", "regular", "bonus"]).optional(),
  cursor: z.string().min(1).max(4_096).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
});

export const analyticsPlayerDetailsQuerySchema = analyticsReadQuerySchema.extend({
  resourceId: z.string().trim().min(1).max(80).optional(),
  historyCursor: z.string().min(1).max(4_096).optional(),
  historyLimit: z.coerce.number().int().min(1).max(100).optional(),
});
