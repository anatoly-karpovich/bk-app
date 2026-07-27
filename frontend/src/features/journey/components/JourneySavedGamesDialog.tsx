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
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import { journeyTexts } from "../../../texts/journeyTexts";
import { formatJourneyResourceAmounts } from "../journey-page.helpers";
import type { JourneySavedGameSummary, JourneySavedGamePlayer } from "../types";

const savedGamesTexts = {
  title: "Сохраненные игры",
  loading: "Загружаем список игр",
  empty: "Сохраненных игр пока нет.",
  current: "Текущая",
  rounds: "Раунды",
  dj: "Ведущий",
  djMissing: "Не указан",
  startedAt: "Старт",
  updatedAt: "Последнее обновление",
  restoreTooltip: "Восстановить игру",
  deleteTooltip: "Удалить игру",
  deleting: "Удаляем игру...",
  playerCell: "Клетка",
  playerPrize: "Баланс",
  playerStatusActive: "Активен",
  playerStatusFinished: "Финиш",
  playerStatusRemoved: "Удален",
};

interface JourneySavedGamesDialogProps {
  open: boolean;
  games: JourneySavedGameSummary[];
  currentGameId: string | null;
  loading: boolean;
  restoreLoading: boolean;
  deletingGameId: string | null;
  error: string | null;
  onClose: () => void;
  onRestore: (gameId: string) => void;
  onDelete: (game: JourneySavedGameSummary) => void;
}

function formatSavedGameTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPlayerStatusLabel(player: JourneySavedGamePlayer): string {
  if (player.status === "finished") {
    return savedGamesTexts.playerStatusFinished;
  }

  if (player.status === "removed") {
    return savedGamesTexts.playerStatusRemoved;
  }

  return savedGamesTexts.playerStatusActive;
}

export default function JourneySavedGamesDialog({
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
}: JourneySavedGamesDialogProps) {
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

        {!loading && !games.length ? <Alert severity="info">{savedGamesTexts.empty}</Alert> : null}

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
                            label={game.status === "finished" ? journeyTexts.statuses.complete : journeyTexts.statuses.active}
                          />
                          <AppChip size="small" variant="outlined" label={`${savedGamesTexts.rounds}: ${game.roundsCount}`} />
                          <AppChip size="small" variant="outlined" label={`${savedGamesTexts.dj}: ${game.djName || savedGamesTexts.djMissing}`} />
                          {isCurrentGame ? <AppChip size="small" color="secondary" label={savedGamesTexts.current} /> : null}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" color="text.secondary">
                            {savedGamesTexts.startedAt}: {formatSavedGameTimestamp(game.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {savedGamesTexts.updatedAt}: {formatSavedGameTimestamp(game.updatedAt)}
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
                    <Box
                      sx={{
                        borderRadius: (theme) => theme.customRadii.md,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        backgroundColor: "rgba(15, 23, 42, 0.02)",
                      }}
                    >
                      <List disablePadding>
                        {game.players.map((player, index) => (
                          <ListItem
                            key={player.id}
                            divider={index < game.players.length - 1}
                            sx={{
                              py: 1.25,
                              px: 2,
                              alignItems: "flex-start",
                            }}
                          >
                            <ListItemText
                              disableTypography
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                  <Typography variant="body1" fontWeight={600}>
                                    {player.nickname}
                                  </Typography>
                                  <AppChip size="small" variant="outlined" label={getPlayerStatusLabel(player)} />
                                </Stack>
                              }
                              secondary={
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {savedGamesTexts.playerCell}: {player.position}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {savedGamesTexts.playerPrize}: [{formatJourneyResourceAmounts(player.balanceEntries, game.resources, { includeZero: true })}]
                                  </Typography>
                                </Stack>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
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
          {journeyTexts.actions.close}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
