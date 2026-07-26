import { useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import { journeyTexts } from "../../../texts/journeyTexts";
import type { JourneyForumStateMessage } from "../types";

interface JourneyForumStateDialogProps {
  open: boolean;
  forumState: JourneyForumStateMessage | null;
  onClose: () => void;
}

export default function JourneyForumStateDialog({ open, forumState, onClose }: JourneyForumStateDialogProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyForumState() {
    if (!forumState) {
      return;
    }

    try {
      await navigator.clipboard.writeText(forumState.text);
      setCopiedText(forumState.text);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{journeyTexts.dialogTitles.forumState}</DialogTitle>
      <DialogContent dividers>
        {forumState ? (
          <>
            <Box
              sx={{
                p: 2,
                borderRadius: (theme) => theme.customRadii.surface,
                backgroundColor: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                whiteSpace: "pre-wrap",
              }}
            >
              {forumState.text}
            </Box>
            {copyFailed ? <Alert severity="error" sx={{ mt: 2 }}>{journeyTexts.alerts.forumStateCopyFailed}</Alert> : null}
          </>
        ) : (
          <Alert severity="info">{journeyTexts.alerts.forumStateUnavailable}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {journeyTexts.actions.close}
        </AppPillButton>
        <AppPillButton
          variant="contained"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={copyForumState}
          disabled={!forumState}
        >
          {copiedText === forumState?.text ? journeyTexts.actions.copied : journeyTexts.actions.copy}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
