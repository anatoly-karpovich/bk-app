import { Alert, Box, Card, CardContent, CardHeader, IconButton, Stack, Switch, Tooltip, Typography } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { getJourneyPlayerFullPrize } from "../engine";
import { isValidDiceValue } from "../journey-page.helpers";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { JourneyConfig, JourneyMoveInputs, JourneyPlayer, JourneySkippedPlayers } from "../types";

interface JourneyRoundControlsCardProps {
  activePlayers: JourneyPlayer[];
  moveInputs: JourneyMoveInputs;
  skippedPlayers: JourneySkippedPlayers;
  journeyConfig: JourneyConfig;
  canSubmitRound: boolean;
  onMoveInputChange: (nickname: string, value: string) => void;
  onSkipToggle: (nickname: string) => void;
  onRemovePlayer: (nickname: string) => void;
  onOpenImport: () => void;
  onSubmitRound: () => void;
}

export default function JourneyRoundControlsCard({
  activePlayers,
  moveInputs,
  skippedPlayers,
  journeyConfig,
  canSubmitRound,
  onMoveInputChange,
  onSkipToggle,
  onRemovePlayer,
  onOpenImport,
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
                key={player.nickname}
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "flex-start" }}
                sx={{ p: 1.5, borderRadius: (theme) => theme.customRadii.md, backgroundColor: "rgba(255,255,255,0.6)" }}
              >
                <Box sx={{ minWidth: 160 }}>
                  <Typography fontWeight={700}>{player.nickname}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {journeyTexts.table.cell} {player.position} - {getJourneyPlayerFullPrize(player)} {journeyConfig.currency}
                  </Typography>
                </Box>

                <AppTextInput
                  type="number"
                  label={journeyTexts.fields.move}
                  size="small"
                  value={moveInputs[player.nickname] ?? ""}
                  onChange={(event) => onMoveInputChange(player.nickname, event.target.value)}
                  disabled={Boolean(skippedPlayers[player.nickname])}
                  inputProps={{ min: journeyConfig.minDice, max: journeyConfig.maxDice }}
                  error={
                    Boolean(moveInputs[player.nickname]) &&
                    !isValidDiceValue(moveInputs[player.nickname], journeyConfig) &&
                    !skippedPlayers[player.nickname]
                  }
                />

                <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
                  <Typography variant="body2">{journeyTexts.fields.skip}</Typography>
                  <Switch checked={Boolean(skippedPlayers[player.nickname])} onChange={() => onSkipToggle(player.nickname)} />
                  <Tooltip title={journeyTexts.tooltips.removePlayer}>
                    <IconButton color="error" onClick={() => onRemovePlayer(player.nickname)}>
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ))
          ) : (
            <Alert severity="success">{journeyTexts.alerts.allPlayersFinished}</Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <AppPillButton variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={onOpenImport}>
              {journeyTexts.actions.importMoves}
            </AppPillButton>
            <AppPillButton variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={onSubmitRound} disabled={!canSubmitRound}>
              {journeyTexts.actions.applyMove}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
