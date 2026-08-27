import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";
import { ANALYTICS_SOURCE_TYPES } from "../analytics/domain/sourceTypes";
import { PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH } from "./domain/types";

const activityTypeSchema = z.object({
  type: z.enum(ANALYTICS_SOURCE_TYPES),
  defaultTitle: z.string().trim().min(1).max(PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH),
  enabled: z.boolean(),
});

const activityTypesSchema = z
  .array(activityTypeSchema)
  .length(ANALYTICS_SOURCE_TYPES.length)
  .superRefine((activityTypes, context) => {
    const receivedTypes = new Set(activityTypes.map((activityType) => activityType.type));

    if (receivedTypes.size !== activityTypes.length) {
      context.addIssue({ code: "custom", message: "Activity types must not contain duplicates" });
    }

    for (const type of ANALYTICS_SOURCE_TYPES) {
      if (!receivedTypes.has(type)) {
        context.addIssue({ code: "custom", message: `Activity types must include '${type}'` });
      }
    }
  });

export const projectIdParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const projectMutationSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).default(""),
  resources: z
    .array(
      z.discriminatedUnion("type", [
        z
          .object({
            type: z.literal("currency"),
            id: z.string().trim().min(1).max(80),
            code: z.string().trim().min(1).max(80),
            name: z.string().trim().min(1).max(160),
            label: z.string().trim().min(1).max(160),
            valueType: z.enum(["integer", "decimal"]),
            precision: z.number().int().min(0).max(1),
          })
          .superRefine((currency, context) => {
            if (currency.valueType === "integer" && currency.precision !== 0) {
              context.addIssue({
                code: "custom",
                path: ["precision"],
                message: "Integer currencies must use precision 0",
              });
            }
          }),
        z.object({
          type: z.literal("item"),
          id: z.string().trim().min(1).max(80),
          code: z.string().trim().min(1).max(80),
          name: z.string().trim().min(1).max(160),
          label: z.string().trim().min(1).max(160),
        }),
      ]),
    )
    .min(1),
  activityTypes: activityTypesSchema,
});
