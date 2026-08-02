import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "./auth.config";
import { AuthService } from "./AuthService";
import { changePasswordSchema, loginSchema, updateOwnProjectNicknameSchema } from "./auth.schemas";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const input = parseRequest(loginSchema, req.body, "Invalid login input");
    const result = await this.authService.login(input.login, input.password, {
      userAgent: req.get("user-agent") ?? undefined,
      ipAddress: req.ip,
    });
    res.cookie(SESSION_COOKIE_NAME, result.token, getSessionCookieOptions());
    return res.status(200).json({ success: true, data: { user: result.user } });
  };

  logout = async (req: Request, res: Response) => {
    await this.authService.logout(getSessionToken(req));
    res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
    return res.status(204).send();
  };

  getCurrentUser = async (req: Request, res: Response) => {
    return res.status(200).json({ success: true, data: { user: req.authUser } });
  };

  changePassword = async (req: Request, res: Response) => {
    const input = parseRequest(changePasswordSchema, req.body, "Invalid password input");
    await this.authService.changePassword(req.authUser!.id, input.currentPassword, input.newPassword);
    res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
    return res.status(204).send();
  };

  updateOwnProjectNickname = async (req: Request, res: Response) => {
    const input = parseRequest(updateOwnProjectNicknameSchema, req.body, "Invalid project nickname");
    const user = await this.authService.updateOwnProjectNickname(req.authUser!.id, req.params.projectId as string, input.nickname);
    return res.status(200).json({ success: true, data: { user } });
  };
}

export function getSessionToken(req: Request): string | undefined {
  const cookieHeader = req.get("cookie");
  if (!cookieHeader) return undefined;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const cookie = cookieHeader.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(prefix.length));
}
