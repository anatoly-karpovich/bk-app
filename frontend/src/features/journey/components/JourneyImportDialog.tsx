import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyImportDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
  helperText: string;
  minRows: number;
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
}: JourneyImportDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {journeyTexts.actions.cancel}
        </AppPillButton>
        <AppPillButton
          variant="contained"
          onClick={() => {
            onApply();
            onClose();
          }}
        >
          {journeyTexts.actions.apply}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
