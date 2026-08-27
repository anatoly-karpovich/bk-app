import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
import { isAnalyticsCalendarDate } from "../analytics/domain/occurrenceDate";
import { ANALYTICS_ACTIVITY_SOURCE_TYPES } from "../analytics/domain/sourceTypes";
import { ACTIVITY_RESULT_TITLE_MAX_LENGTH } from "./domain/types";

export const activitiesProjectParamsSchema = z.object({ projectId: objectIdSchema });
export const activityResultParamsSchema = z.object({ projectId: objectIdSchema, activityId: objectIdSchema });

const resourceAmountSchema = z.object({
  resourceId: z.string().trim().min(1).max(80),
  amount: z.number().finite().positive(),
});

const participantSchema = z.object({
  nickname: z.string().trim().min(1).max(160),
  playerRefId: objectIdSchema.nullable().optional(),
  rewards: z.object({
    regular: z.array(resourceAmountSchema),
    bonus: z.array(resourceAmountSchema),
  }),
});

const activityResultInputSchema = z.object({
  type: z.enum(ANALYTICS_ACTIVITY_SOURCE_TYPES),
  title: z.string().trim().min(1).max(ACTIVITY_RESULT_TITLE_MAX_LENGTH),
  conductedOn: z.string().trim().refine(isAnalyticsCalendarDate, "Expected YYYY-MM-DD calendar date").nullable(),
  participants: z.array(participantSchema),
});

export const createActivityResultSchema = activityResultInputSchema;
export const updateActivityResultSchema = activityResultInputSchema.extend({
  expectedRevision: z.number().int().nonnegative(),
});
export const activityResultRevisionSchema = z.object({ expectedRevision: z.number().int().nonnegative() });

export type ActivityResultInput = z.infer<typeof activityResultInputSchema>;
