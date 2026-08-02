import { CircularProgress, Stack } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, error } = useAuth(); const location = useLocation();
  if (status === "loading") return <Stack sx={{ minHeight: "100vh" }} alignItems="center" justifyContent="center"><CircularProgress /></Stack>;
  if (status === "error") return <Stack sx={{ minHeight: "100vh" }} alignItems="center" justifyContent="center">{error}</Stack>;
  return status === "authenticated" ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />;
}
