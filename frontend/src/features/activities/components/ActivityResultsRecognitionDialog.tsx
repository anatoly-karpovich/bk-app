import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import {
  parseActivityResultsRecognition,
  type RecognizedActivityResult,
} from "../activityResultsRecognition.helpers";

interface ActivityRecognitionResource {
  id: string;
  label: string;
}

interface ActivityResultsRecognitionDialogProps {
  open: boolean;
  resources: readonly ActivityRecognitionResource[];
  onClose: () => void;
  onRecognize: (resourceId: string, results: readonly RecognizedActivityResult[]) => void;
}

export default function ActivityResultsRecognitionDialog({
  open,
  resources,
  onClose,
  onRecognize,
}: ActivityResultsRecognitionDialogProps) {
  const [text, setText] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setResourceId(resources[0]?.id ?? "");
    setError(null);
  }, [open, resources]);

  const recognize = () => {
    const parsed = parseActivityResultsRecognition(text);
    if (!resourceId) {
      setError("Выберите ресурс для распознанных наград.");
      return;
    }
    if (!parsed.results.length) {
      setError("Не удалось распознать ни одной строки. Укажите ник и положительную сумму награды.");
      return;
    }

    onRecognize(resourceId, parsed.results);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Распознать результаты</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Вставьте по одному получателю в строке: ник, затем сумма. Формат <code>30+30</code> заполнит обычную и бонусную награды выбранного ресурса.
          </Typography>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          <FormControl fullWidth>
            <InputLabel id="activity-recognition-resource-label">Ресурс</InputLabel>
            <Select
              labelId="activity-recognition-resource-label"
              label="Ресурс"
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
            >
              {resources.map((resource) => (
                <MenuItem key={resource.id} value={resource.id}>
                  {resource.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <AppTextInput
            autoFocus
            fullWidth
            multiline
            minRows={8}
            label="Результаты с форума"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"AVENDATOR 30\nБоевой Дровосек 20\nВнезапно 30+30"}
            helperText="Текст после суммы, например «фишек», будет проигнорирован."
            inputSx={{ "& textarea": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: 1.55 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          Отмена
        </AppPillButton>
        <AppPillButton variant="contained" startIcon={<AutoFixHighRoundedIcon />} onClick={recognize}>
          Распознать
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
