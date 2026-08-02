import type { ReactNode } from "react";
import { Alert, Box } from "@mui/material";
import { useAuth } from "./useAuth";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Box sx={{ py: 4 }}><Alert severity="error">Этот раздел доступен только администраторам.</Alert></Box>;
  }

  return <>{children}</>;
}
