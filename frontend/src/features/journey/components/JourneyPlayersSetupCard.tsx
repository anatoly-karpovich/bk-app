import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Card, CardContent, CardHeader, IconButton, Stack } from "@mui/material";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppPillButton from "../../../components/ui/AppPillButton";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyPlayersSetupCardProps {
  playerNames: string[];
  playerNameErrors: string[];
  actionsDisabled: boolean;
  canStartGame: boolean;
  isStartingGame: boolean;
  onStartGame: () => void;
  onPlayerNameChange: (index: number, value: string) => void;
  onRemovePlayerField: (index: number) => void;
  onAddPlayerField: () => void;
  onOpenImport: () => void;
}

export default function JourneyPlayersSetupCard({
  playerNames,
  playerNameErrors,
  actionsDisabled,
  canStartGame,
  isStartingGame,
  onStartGame,
  onPlayerNameChange,
  onRemovePlayerField,
  onAddPlayerField,
  onOpenImport,
}: JourneyPlayersSetupCardProps) {
  return (
    <Card>
      <CardHeader
        title={journeyTexts.cards.playersTitle}
        subheader={journeyTexts.cards.playersSubtitle}
        action={
          <AppPillButton
            variant="contained"
            size="small"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={onStartGame}
            disabled={actionsDisabled || !canStartGame}
            loading={isStartingGame}
            sx={{ mt: 0.5 }}
          >
            {journeyTexts.actions.newGame}
          </AppPillButton>
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
            <AppPillButton variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={onOpenImport} disabled={actionsDisabled}>
              {journeyTexts.actions.importPlayers}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
