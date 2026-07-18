import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import AppPillButton from "./AppPillButton";

interface AppConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  confirmColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function AppConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loading = false,
  confirmColor = "primary",
  onClose,
  onConfirm,
}: AppConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs" disableEscapeKeyDown={loading}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </AppPillButton>
        <AppPillButton variant="contained" color={confirmColor} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
