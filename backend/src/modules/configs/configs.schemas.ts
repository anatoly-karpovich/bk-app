import { z } from "zod";

export const configIdParamsSchema = z.object({
  configId: z.string().trim().min(1),
});
