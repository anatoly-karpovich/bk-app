import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

export const projectIdParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const projectMutationSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).default(""),
  currencies: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      code: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(160),
      label: z.string().trim().min(1).max(160),
      shortLabel: z.string().trim().min(1).max(80).optional(),
      valueType: z.enum(["integer", "decimal"]),
      precision: z.number().int().min(0).max(8),
    }).superRefine((currency, context) => {
      if (currency.valueType === "integer" && currency.precision !== 0) {
        context.addIssue({
          code: "custom",
          path: ["precision"],
          message: "Integer currencies must use precision 0",
        });
      }
    }),
  ).min(1),
});
