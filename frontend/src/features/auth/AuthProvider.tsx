import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "../../lib/apiClient";
import { getCurrentUserRequest, loginRequest, logoutRequest, updateOwnProjectNicknameRequest } from "./api/auth.client";
import type { CurrentUser } from "./types";

export interface AuthContextValue {
  user: CurrentUser | null;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
  login(input: { login: string; password: string }): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  updateOwnProjectNickname(projectId: string, nickname: string): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setStatus("loading"); setError(null);
    try { setUser(await getCurrentUserRequest()); setStatus("authenticated"); }
    catch (nextError) {
      setUser(null);
      if (nextError instanceof ApiError && nextError.status === 401) setStatus("unauthenticated");
      else { setStatus("error"); setError(nextError instanceof Error ? nextError.message : "Failed to restore session"); }
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onAuthenticationRequired = () => { setUser(null); setStatus("unauthenticated"); };
    window.addEventListener("bk:auth-required", onAuthenticationRequired);
    return () => window.removeEventListener("bk:auth-required", onAuthenticationRequired);
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user, status, error, refresh,
    login: async (input) => { const loggedInUser = await loginRequest(input); setUser(loggedInUser); setStatus("authenticated"); setError(null); },
    logout: async () => { try { await logoutRequest(); } finally { setUser(null); setStatus("unauthenticated"); } },
    updateOwnProjectNickname: async (projectId, nickname) => {
      const updatedUser = await updateOwnProjectNicknameRequest(projectId, nickname);
      setUser(updatedUser);
    },
  }), [error, refresh, status, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
