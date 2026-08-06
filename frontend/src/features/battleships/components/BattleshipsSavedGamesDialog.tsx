import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import { formatBattleshipsTimestamp, getBattleshipsSavedGameStatusLabel } from "../mappers/battleships.mapper";
import type { BattleshipsSavedGameSummary } from "../types";

const savedGamesTexts = {
  title: "Сохраненные игры",
  loading: "Загружаем список игр",
  empty: "Сохраненных игр пока нет.",
  current: "Текущая",
  restoreTooltip: "Восстановить игру",
  deleteTooltip: "Удалить игру",
  deleting: "Удаляем игру...",
  player: "Игрок",
  dj: "Ведущий",
  board: "Поле",
  attempts: "Попытки",
  prize: "Приз",
  startedAt: "Старт",
  updatedAt: "Последнее обновление",
};

interface BattleshipsSavedGamesDialogProps {
  open: boolean;
  games: BattleshipsSavedGameSummary[];
  currentGameId: string | null;
  loading: boolean;
  restoreLoading: boolean;
  deletingGameId: string | null;
  error: string | null;
  onClose: () => void;
  onRestore: (gameId: string) => void;
  onDelete: (game: BattleshipsSavedGameSummary) => void;
}

export default function BattleshipsSavedGamesDialog({
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
}: BattleshipsSavedGamesDialogProps) {
  return (
    <Dialog open={open} onClose={restoreLoading || Boolean(deletingGameId) ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{savedGamesTexts.title}</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 5 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              {savedGamesTexts.loading}
            </Typography>
          </Stack>
        ) : null}

        {!loading && !games.length ? <AppInfoAlert>{savedGamesTexts.empty}</AppInfoAlert> : null}

        {!loading && games.length ? (
          <Stack spacing={1.5}>
            {games.map((game) => {
              const isCurrentGame = currentGameId === game.id;
              const isDeleting = deletingGameId === game.id;

              return (
                <Accordion key={game.id} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ md: "center" }}
                      sx={{ width: "100%", pr: 1 }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>
                            {game.configName}
                          </Typography>
                          <AppChip
                            size="small"
                            color={game.status === "finished" ? "success" : "info"}
                            label={getBattleshipsSavedGameStatusLabel(game)}
                           />
                           <AppChip size="small" variant="outlined" label={`${savedGamesTexts.player}: ${game.playerName}`} />
                           <AppChip size="small" variant="outlined" label={`${savedGamesTexts.dj}: ${game.djName || "Не указан"}`} />
                           <AppChip
                            size="small"
                            variant="outlined"
                            label={`${savedGamesTexts.prize}: ${formatResourceAmounts(game.currentPrize, game.resources) || "0"}`}
                          />
                          {isCurrentGame ? <AppChip size="small" color="secondary" label={savedGamesTexts.current} /> : null}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" color="text.secondary">
                            {savedGamesTexts.startedAt}: {formatBattleshipsTimestamp(game.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {savedGamesTexts.updatedAt}: {formatBattleshipsTimestamp(game.updatedAt)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ alignSelf: { xs: "flex-end", md: "center" } }}>
                        <Tooltip title={savedGamesTexts.restoreTooltip}>
                          <span>
                            <IconButton
                              color="primary"
                              onClick={(event) => {
                                event.stopPropagation();
                                onRestore(game.id);
                              }}
                              disabled={restoreLoading || Boolean(deletingGameId)}
                            >
                              <RestoreRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={savedGamesTexts.deleteTooltip}>
                          <span>
                            <IconButton
                              color="error"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(game);
                              }}
                              disabled={restoreLoading || Boolean(deletingGameId)}
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack
                      spacing={1}
                      sx={{
                        p: 2,
                        borderRadius: (theme) => theme.customRadii.md,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        backgroundColor: "rgba(15, 23, 42, 0.02)",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Ресурсы: {game.resources.map((resource) => resource.label).join(", ")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {savedGamesTexts.board}: {game.boardSize}x{game.boardSize}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {savedGamesTexts.attempts}: {game.attemptsLeft}/{game.maxShots}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ходов: {game.shotsCount}
                      </Typography>
                    </Stack>
                    {isDeleting ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                        {savedGamesTexts.deleting}
                      </Typography>
                    ) : null}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose} disabled={restoreLoading || Boolean(deletingGameId)}>
          {battleshipsTexts.actions.close}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
