import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: () => Promise<boolean>;
  title: string;
  value: string;
  onChange: (value: string) => void;
  helperText: string;
  minRows: number;
  loading?: boolean;
}

export default function JourneyImportDialog({
  open,
  onClose,
  onApply,
  title,
  value,
  onChange,
  helperText,
  minRows,
  loading = false,
}: JourneyImportDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md" disableEscapeKeyDown={loading}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <AppTextInput
          autoFocus
          fullWidth
          label={journeyTexts.fields.forumText}
          multiline
          minRows={minRows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          helperText={helperText}
          sx={{ mt: 1 }}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose} disabled={loading}>
          {journeyTexts.actions.cancel}
        </AppPillButton>
        <AppPillButton
          variant="contained"
          loading={loading}
          onClick={async () => {
            const applied = await onApply();

            if (applied) {
              onClose();
            }
          }}
        >
          {journeyTexts.actions.apply}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
