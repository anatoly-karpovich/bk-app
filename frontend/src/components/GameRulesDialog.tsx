import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { ReactNode } from "react";
import AppPillButton from "./ui/AppPillButton";

interface GameRulesDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg";
}

export default function GameRulesDialog({ open, title, children, onClose, maxWidth = "md" }: GameRulesDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          Закрыть
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
