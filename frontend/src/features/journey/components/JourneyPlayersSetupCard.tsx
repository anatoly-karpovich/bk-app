import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Card, CardContent, CardHeader, IconButton, Stack, Typography } from "@mui/material";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyPlayersSetupCardProps {
  playerNames: string[];
  playerNameErrors: string[];
  validPlayersCount: number;
  forumTopicId: string;
  actionsDisabled: boolean;
  canStartGame: boolean;
  canImportPlayersFromForum: boolean;
  isStartingGame: boolean;
  isImportingPlayersFromForum: boolean;
  onStartGame: () => void;
  onForumTopicIdChange: (value: string) => void;
  onPlayerNameChange: (index: number, value: string) => void;
  onRemovePlayerField: (index: number) => void;
  onAddPlayerField: () => void;
  onOpenImport: () => void;
  onImportPlayersFromForum: () => void;
}

export default function JourneyPlayersSetupCard({
  playerNames,
  playerNameErrors,
  validPlayersCount,
  forumTopicId,
  actionsDisabled,
  canStartGame,
  canImportPlayersFromForum,
  isStartingGame,
  isImportingPlayersFromForum,
  onStartGame,
  onForumTopicIdChange,
  onPlayerNameChange,
  onRemovePlayerField,
  onAddPlayerField,
  onOpenImport,
  onImportPlayersFromForum,
}: JourneyPlayersSetupCardProps) {
  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5">{journeyTexts.cards.playersTitle}</Typography>
            {validPlayersCount > 0 ? (
              <AppChip
                color="primary"
                label={validPlayersCount}
                size="small"
                sx={{ fontWeight: 700, "& .MuiChip-label": { px: 1 } }}
              />
            ) : null}
          </Stack>
        }
        titleTypographyProps={{ component: "div" }}
        subheader={journeyTexts.cards.playersSubtitle}
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 0.5 }}>
            <AppTextInput
              label={journeyTexts.fields.forumTopic}
              placeholder={journeyTexts.placeholders.forumTopic}
              value={forumTopicId}
              onChange={(event) => onForumTopicIdChange(event.target.value.replace(/\D/g, ""))}
              disabled={actionsDisabled}
              size="small"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              sx={{ width: { xs: "100%", sm: 180 } }}
            />
            <AppPillButton
              variant="contained"
              size="small"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={onStartGame}
              disabled={actionsDisabled || !canStartGame}
              loading={isStartingGame}
              sx={{ alignSelf: { xs: "flex-end", sm: "center" }, whiteSpace: "nowrap" }}
            >
              {journeyTexts.actions.newGame}
            </AppPillButton>
          </Stack>
        }
      />
      <CardContent>
        <Stack spacing={2}>
          {playerNames.map((playerName, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <GamePlayerNameInput
                label={`${journeyTexts.fields.playerPrefix} ${index + 1}`}
                value={playerName}
                onChange={(nextValue) => onPlayerNameChange(index, nextValue)}
                errorText={playerNameErrors[index] || null}
                helperTextMode="hidden"
                disabled={actionsDisabled}
              />
              <IconButton color="error" onClick={() => onRemovePlayerField(index)} disabled={actionsDisabled}>
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Stack>
          ))}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <AppPillButton variant="outlined" startIcon={<AddRoundedIcon />} onClick={onAddPlayerField} disabled={actionsDisabled}>
              {journeyTexts.actions.addPlayer}
            </AppPillButton>
            <AppPillButton
              variant="outlined"
              startIcon={<ForumRoundedIcon />}
              onClick={onImportPlayersFromForum}
              disabled={actionsDisabled || !canImportPlayersFromForum}
              loading={isImportingPlayersFromForum}
            >
              {journeyTexts.actions.importPlayersFromForum}
            </AppPillButton>
            <AppPillButton variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={onOpenImport} disabled={actionsDisabled}>
              {journeyTexts.actions.importPlayers}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
