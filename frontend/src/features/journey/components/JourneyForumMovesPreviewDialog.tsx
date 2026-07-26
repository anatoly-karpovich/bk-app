import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import { journeyTexts } from "../../../texts/journeyTexts";
import type { JourneyForumMovesPreview } from "../types";

interface JourneyForumMovesPreviewDialogProps {
  open: boolean;
  preview: JourneyForumMovesPreview | null;
  onClose: () => void;
  onApply: () => void;
}

function getIgnoredReasonLabel(reason: JourneyForumMovesPreview["ignoredMessages"][number]["reason"]): string {
  return journeyTexts.forumPreview.ignoredReasons[reason];
}

export default function JourneyForumMovesPreviewDialog({
  open,
  preview,
  onClose,
  onApply,
}: JourneyForumMovesPreviewDialogProps) {
  if (!preview) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{journeyTexts.dialogTitles.forumMovesPreview}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {journeyTexts.forumPreview.summary(preview.topicId, preview.nextRoundIndex)}
          </Typography>

          {preview.moves.length ? (
            <Table size="small" aria-label={journeyTexts.forumPreview.detectedMoves}>
              <TableHead>
                <TableRow>
                  <TableCell>{journeyTexts.forumPreview.player}</TableCell>
                  <TableCell>{journeyTexts.forumPreview.move}</TableCell>
                  <TableCell>{journeyTexts.forumPreview.message}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.moves.map((move) => (
                  <TableRow key={move.playerId}>
                    <TableCell>{move.playerNickname}</TableCell>
                    <TableCell>{move.dice}</TableCell>
                    <TableCell>{move.sourceMessage.text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="warning">{journeyTexts.forumPreview.noMoves}</Alert>
          )}

          {preview.ignoredMessages.length ? (
            <>
              <Divider />
              <Typography variant="subtitle2">{journeyTexts.forumPreview.ignoredTitle}</Typography>
              <Stack spacing={0.5}>
                {preview.ignoredMessages.map((message) => (
                  <Typography key={message.id} variant="body2" color="text.secondary">
                    {message.authorLogin}: {getIgnoredReasonLabel(message.reason)}
                  </Typography>
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {journeyTexts.actions.cancel}
        </AppPillButton>
        <AppPillButton variant="contained" onClick={onApply} disabled={!preview.moves.length}>
          {journeyTexts.actions.applyForumMoves}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
