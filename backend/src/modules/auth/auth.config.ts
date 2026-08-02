export const SESSION_COOKIE_NAME = "bk_session";
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  path: "/";
  maxAge: number;
}

export function getSessionCookieOptions(): AuthCookieOptions {
  const secure = process.env.BK_APP_COOKIE_SECURE === "true";
  const sameSite = process.env.BK_APP_COOKIE_SAME_SITE === "none" ? "none" : "lax";

  if (sameSite === "none" && !secure) {
    throw new Error("BK_APP_COOKIE_SAME_SITE=none requires BK_APP_COOKIE_SECURE=true");
  }

  return { httpOnly: true, secure, sameSite, path: "/", maxAge: SESSION_TTL_MS };
}

export function getAllowedOrigins(): string[] {
  return (process.env.BK_APP_ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
