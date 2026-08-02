import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

export const updateOwnProjectNicknameSchema = z.object({
  nickname: z.string().trim().min(1).max(80),
});
