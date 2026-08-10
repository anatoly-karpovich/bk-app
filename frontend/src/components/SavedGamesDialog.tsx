import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import AppChip from "./ui/AppChip";
import AppInfoAlert from "./ui/AppInfoAlert";
import AppPillButton from "./ui/AppPillButton";

type SavedGameStatusColor = "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";

export interface SavedGameListItem {
  id: string;
  title: string;
  statusLabel: string;
  statusColor: SavedGameStatusColor;
  metadata: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  details?: ReactNode;
}

interface SavedGamesDialogProps {
  open: boolean;
  games: SavedGameListItem[];
  currentGameId: string | null;
  loading: boolean;
  restoreLoading: boolean;
  deletingGameId: string | null;
  error: string | null;
  onClose: () => void;
  onRestore: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

export default function SavedGamesDialog({
  open,
  games,
  currentGameId,
  loading,
  restoreLoading,
  deletingGameId,
  error,
  onClose,
  onRestore,
  onDelete,
}: SavedGamesDialogProps) {
  const isBusy = restoreLoading || Boolean(deletingGameId);

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Сохранённые игры</DialogTitle>
      <DialogContent dividers>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 5 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">Загружаем список игр</Typography>
          </Stack>
        ) : null}
        {!loading && !games.length ? <AppInfoAlert>Сохранённых игр пока нет.</AppInfoAlert> : null}
        {!loading && games.length ? (
          <Stack spacing={1.5}>
            {games.map((game) => {
              const isCurrentGame = currentGameId === game.id;
              const isDeleting = deletingGameId === game.id;

              return (
                <Accordion key={game.id} disableGutters>
                  <AccordionSummary expandIcon={game.details ? <ExpandMoreRoundedIcon /> : null}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ width: "100%", pr: 1 }}>
                      <Stack spacing={1} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>{game.title}</Typography>
                          <AppChip size="small" color={game.statusColor} label={game.statusLabel} />
                          {isCurrentGame ? <AppChip size="small" color="secondary" label="Текущая" /> : null}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{game.metadata}</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" color="text.secondary">Старт: {game.createdAtLabel}</Typography>
                          <Typography variant="body2" color="text.secondary">Обновлена: {game.updatedAtLabel}</Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ alignSelf: { xs: "flex-end", md: "center" } }}>
                        <Tooltip title={isCurrentGame ? "Игра уже открыта" : "Восстановить игру"}>
                          <span>
                            <IconButton
                              color="primary"
                              disabled={isBusy || isCurrentGame}
                              onClick={(event) => {
                                event.stopPropagation();
                                onRestore(game.id);
                              }}
                            >
                              <RestoreRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Удалить игру">
                          <span>
                            <IconButton
                              color="error"
                              disabled={isBusy}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(game.id);
                              }}
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  {game.details ? (
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Box sx={{ p: 2, borderRadius: (theme) => theme.customRadii.md, border: "1px solid rgba(15, 23, 42, 0.08)", backgroundColor: "rgba(15, 23, 42, 0.02)" }}>
                        {game.details}
                      </Box>
                      {isDeleting ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>Удаляем игру...</Typography> : null}
                    </AccordionDetails>
                  ) : null}
                </Accordion>
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose} disabled={isBusy}>Закрыть</AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
