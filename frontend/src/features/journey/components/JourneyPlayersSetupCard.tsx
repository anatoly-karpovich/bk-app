import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Card, CardContent, CardHeader, IconButton, Stack, Typography } from "@mui/material";
import AddPlayerButton from "../../../components/AddPlayerButton";
import GameActionButton from "../../../components/GameActionButton";
import GameStartButton from "../../../components/GameStartButton";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppChip from "../../../components/ui/AppChip";
import AppTextInput from "../../../components/ui/AppTextInput";
import { journeyTexts } from "../../../texts/journeyTexts";
import JourneyActionPanel from "./JourneyActionPanel";

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
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
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

              <Stack direction="row" spacing={1} alignItems="center">
                <AppTextInput
                  label={journeyTexts.fields.forumTopic}
                  placeholder={journeyTexts.placeholders.forumTopic}
                  value={forumTopicId}
                  onChange={(event) => onForumTopicIdChange(event.target.value.replace(/\D/g, ""))}
                  disabled={actionsDisabled}
                  size="small"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  sx={{ width: { xs: "auto", sm: 180 }, flexGrow: { xs: 1, sm: 0 } }}
                />
                <GameStartButton
                  label={journeyTexts.actions.newGame}
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={onStartGame}
                  disabled={actionsDisabled || !canStartGame}
                  loading={isStartingGame}
                />
              </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {journeyTexts.cards.playersSubtitle}
            </Typography>
          </Stack>
        }
        titleTypographyProps={{ component: "div" }}
        sx={{ "& .MuiCardHeader-content": { minWidth: 0 } }}
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

          <JourneyActionPanel>
            <AddPlayerButton onClick={onAddPlayerField} disabled={actionsDisabled} />
            <GameActionButton
              label={journeyTexts.actions.fromForum}
              icon={<ForumRoundedIcon />}
              onClick={onImportPlayersFromForum}
              disabled={actionsDisabled || !canImportPlayersFromForum}
              loading={isImportingPlayersFromForum}
            />
            <GameActionButton
              label={journeyTexts.actions.import}
              icon={<UploadFileRoundedIcon />}
              onClick={onOpenImport}
              disabled={actionsDisabled}
            />
          </JourneyActionPanel>
        </Stack>
      </CardContent>
    </Card>
  );
}
