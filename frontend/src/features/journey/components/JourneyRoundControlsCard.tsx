import { Alert, Box, Card, CardContent, CardHeader, CircularProgress, IconButton, Stack, Switch, Tooltip, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { isValidDiceValue } from "../journey-page.helpers";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { JourneyConfig, JourneyMoveInputs, JourneyPlayerReadModel, JourneySkippedPlayers } from "../types";

interface JourneyRoundControlsCardProps {
  activePlayers: JourneyPlayerReadModel[];
  moveInputs: JourneyMoveInputs;
  skippedPlayers: JourneySkippedPlayers;
  journeyConfig: JourneyConfig;
  canSubmitRound: boolean;
  actionsDisabled: boolean;
  isImportingMoves: boolean;
  isPreviewingForumMoves: boolean;
  canImportMovesFromForum: boolean;
  isSubmittingRound: boolean;
  removingPlayerId: string | null;
  onMoveInputChange: (playerId: string, value: string) => void;
  onSkipToggle: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onOpenImport: () => void;
  onPreviewForumMoves: () => void;
  onSubmitRound: () => void;
}

export default function JourneyRoundControlsCard({
  activePlayers,
  moveInputs,
  skippedPlayers,
  journeyConfig,
  canSubmitRound,
  actionsDisabled,
  isImportingMoves,
  isPreviewingForumMoves,
  canImportMovesFromForum,
  isSubmittingRound,
  removingPlayerId,
  onMoveInputChange,
  onSkipToggle,
  onRemovePlayer,
  onOpenImport,
  onPreviewForumMoves,
  onSubmitRound,
}: JourneyRoundControlsCardProps) {
  return (
    <Card>
      <CardHeader title={journeyTexts.cards.movesTitle} subheader={journeyTexts.cards.movesSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          {activePlayers.length ? (
            activePlayers.map((player) => (
              <Stack
                key={player.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "flex-start" }}
                sx={{ p: 1.5, borderRadius: (theme) => theme.customRadii.md, backgroundColor: "rgba(255,255,255,0.6)" }}
              >
                <Box sx={{ minWidth: 160 }}>
                  <Typography fontWeight={700}>{player.nickname}</Typography>
                </Box>

                <AppTextInput
                  type="number"
                  label={journeyTexts.fields.move}
                  size="small"
                  value={moveInputs[player.id] ?? ""}
                  onChange={(event) => onMoveInputChange(player.id, event.target.value)}
                  disabled={actionsDisabled || Boolean(skippedPlayers[player.id])}
                  inputProps={{ min: journeyConfig.minDice, max: journeyConfig.maxDice }}
                  error={
                    Boolean(moveInputs[player.id]) &&
                    !isValidDiceValue(moveInputs[player.id], journeyConfig) &&
                    !skippedPlayers[player.id]
                  }
                />

                <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                  <Typography variant="body2">{journeyTexts.fields.skip}</Typography>
                  <Switch
                    checked={Boolean(skippedPlayers[player.id])}
                    onChange={() => onSkipToggle(player.id)}
                    disabled={actionsDisabled}
                  />
                  <Tooltip title={journeyTexts.tooltips.removePlayer}>
                    <IconButton color="error" onClick={() => onRemovePlayer(player.id)} disabled={actionsDisabled}>
                      {removingPlayerId === player.id ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DeleteOutlineRoundedIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ))
          ) : (
            <Alert severity="success">{journeyTexts.alerts.allPlayersFinished}</Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <AppPillButton
              variant="outlined"
              startIcon={<ForumRoundedIcon />}
              onClick={onPreviewForumMoves}
              disabled={actionsDisabled || !canImportMovesFromForum}
              loading={isPreviewingForumMoves}
            >
              {journeyTexts.actions.importMovesFromForum}
            </AppPillButton>
            <AppPillButton
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              onClick={onOpenImport}
              disabled={actionsDisabled}
              loading={isImportingMoves}
            >
              {journeyTexts.actions.importMoves}
            </AppPillButton>
            <AppPillButton
              variant="contained"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={onSubmitRound}
              disabled={actionsDisabled || !canSubmitRound}
              loading={isSubmittingRound}
            >
              {journeyTexts.actions.applyMove}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
