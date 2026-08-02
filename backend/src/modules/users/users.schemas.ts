import { z } from "zod";
import { objectIdSchema } from "../../common/validation/objectIdSchema";

const userRoleSchema = z.enum(["admin", "host"]);
const profileSchema = z.object({ projectId: objectIdSchema, nickname: z.string().trim().min(1).max(80) });

export const userIdParamsSchema = z.object({ userId: objectIdSchema });
export const usersListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  role: userRoleSchema.optional(),
  status: z.enum(["active", "blocked"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export const createUserSchema = z.object({
  login: z.string().trim().min(3).max(40),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(10).max(128),
  role: userRoleSchema,
  projectProfiles: z.array(profileSchema).min(1),
});
export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  role: userRoleSchema.optional(),
  projectProfiles: z.array(profileSchema).min(1).optional(),
}).refine((input) => Object.keys(input).length > 0, "At least one field is required");
export const resetPasswordSchema = z.object({ password: z.string().min(10).max(128) });
