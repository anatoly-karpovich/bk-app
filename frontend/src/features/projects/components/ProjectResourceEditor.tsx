import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Card, CardContent, Divider, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { ProjectCurrencyDraft, ProjectResourceDraft } from "../projectPage.helpers";

interface ProjectResourceEditorProps {
  resource: ProjectResourceDraft;
  disabled: boolean;
  canRemove: boolean;
  onChange: (resource: ProjectResourceDraft) => void;
  onRemove: () => void;
}

function getPreview(resource: ProjectResourceDraft): string {
  const label = resource.label || (resource.type === "currency" ? "единиц" : "Название предмета");
  return resource.type === "currency" ? `30 ${label}` : `${label} ×1`;
}

export default function ProjectResourceEditor({ resource, disabled, canRemove, onChange, onRemove }: ProjectResourceEditorProps) {
  const isUsedByConfig = !resource.isNew && !resource.canDelete;
  const currencyFormatLocked = disabled || isUsedByConfig;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h5">{resource.label || "Новый ресурс"}</Typography>
                <AppChip size="small" color="secondary" label={resource.type === "currency" ? "Валюта" : "Предмет"} />
                <AppChip size="small" label={isUsedByConfig ? "Используется в конфигах" : resource.isNew ? "Новый ресурс" : "Не используется в конфигах"} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Настройки выбранного ресурса</Typography>
            </Box>
            <IconButton
              aria-label={`Удалить ресурс ${resource.label || resource.code || resource.id}`}
              color="error"
              disabled={!canRemove || disabled}
              onClick={onRemove}
            >
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Stack>

          {isUsedByConfig ? (
            <AppInfoAlert>
              Этот ресурс используется в игровом конфиге. Его нельзя удалить{resource.type === "currency" ? " или изменить формат валюты." : "."}
            </AppInfoAlert>
          ) : null}

          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid item xs={12} md={resource.type === "currency" ? 6 : 8}>
              <AppTextInput
                fullWidth
                size="small"
                label="Название"
                value={resource.label}
                disabled={disabled}
                onChange={(event) => onChange({ ...resource, label: event.target.value })}
              />
            </Grid>

            {resource.type === "currency" ? (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <AppTextInput
                    select
                    fullWidth
                    size="small"
                    label="Формат суммы"
                    value={resource.valueType}
                    disabled={currencyFormatLocked}
                    onChange={(event) => {
                      const valueType = event.target.value as ProjectCurrencyDraft["valueType"];
                      onChange({ ...resource, valueType, precision: valueType === "integer" ? 0 : resource.precision || 1 });
                    }}
                  >
                    <MenuItem value="integer">Целая</MenuItem>
                    <MenuItem value="decimal">Десятичная</MenuItem>
                  </AppTextInput>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <AppTextInput
                    fullWidth
                    size="small"
                    type="number"
                    label="Знаков после запятой"
                    value={resource.precision}
                    disabled={currencyFormatLocked || resource.valueType === "integer"}
                    inputProps={{ min: 0, max: 1, step: 1 }}
                    onChange={(event) => onChange({ ...resource, precision: Number(event.target.value) })}
                  />
                </Grid>
              </>
            ) : null}
          </Grid>

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Предпросмотр</Typography>
              <Typography variant="caption" color="text.secondary">Так ресурс будет отображаться внутри игр.</Typography>
            </Box>
            <Box sx={{ px: 1.75, py: 0.85, borderRadius: "999px", bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.main", fontWeight: 700, whiteSpace: "nowrap" }}>
              {getPreview(resource)}
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
