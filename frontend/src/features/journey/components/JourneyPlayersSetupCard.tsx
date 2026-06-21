import { Card, CardContent, CardHeader, IconButton, Stack } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";

interface JourneyPlayersSetupCardProps {
  playerNames: string[];
  playerNameErrors: string[];
  actionsDisabled: boolean;
  onPlayerNameChange: (index: number, value: string) => void;
  onRemovePlayerField: (index: number) => void;
  onAddPlayerField: () => void;
  onOpenImport: () => void;
}

export default function JourneyPlayersSetupCard({
  playerNames,
  playerNameErrors,
  actionsDisabled,
  onPlayerNameChange,
  onRemovePlayerField,
  onAddPlayerField,
  onOpenImport,
}: JourneyPlayersSetupCardProps) {
  return (
    <Card>
      <CardHeader title={journeyTexts.cards.playersTitle} subheader={journeyTexts.cards.playersSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          {playerNames.map((playerName, index) => (
            <Stack key={index} direction="row" spacing={1} alignItems="center">
              <AppTextInput
                fullWidth
                label={`${journeyTexts.fields.playerPrefix} ${index + 1}`}
                value={playerName}
                onChange={(event) => onPlayerNameChange(index, event.target.value)}
                error={Boolean(playerNameErrors[index])}
                placeholder={playerNameErrors[index] || ""}
                FormHelperTextProps={{ sx: { display: "none" } }}
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
