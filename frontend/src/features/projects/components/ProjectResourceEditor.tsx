import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Card, CardContent, Divider, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../../components/ui/AppTextInput";
import { projectTexts } from "../../../texts/projectTexts";
import type { ProjectCurrencyDraft, ProjectResourceDraft } from "../projectPage.helpers";

interface ProjectResourceEditorProps {
  resource: ProjectResourceDraft;
  disabled: boolean;
  canRemove: boolean;
  onChange: (resource: ProjectResourceDraft) => void;
  onRemove: () => void;
}

function getPreview(resource: ProjectResourceDraft): string {
  const label = resource.label || (resource.type === "currency" ? projectTexts.resource.currencyPreviewPlaceholder : projectTexts.resource.itemPreviewPlaceholder);
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
                <Typography variant="h5">{resource.label || projectTexts.resource.newResource}</Typography>
                <AppChip size="small" color="secondary" label={resource.type === "currency" ? projectTexts.resource.currency : projectTexts.resource.item} />
                <AppChip size="small" label={isUsedByConfig ? projectTexts.resource.usedInConfigs : resource.isNew ? projectTexts.resource.newResource : projectTexts.resource.unusedInConfigs} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{projectTexts.resource.editorSubtitle}</Typography>
            </Box>
            <IconButton
              aria-label={projectTexts.resource.deleteAriaLabel(resource.label || resource.code || resource.id)}
              color="error"
              disabled={!canRemove || disabled}
              onClick={onRemove}
            >
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Stack>

          {isUsedByConfig ? (
            <AppInfoAlert>
              {projectTexts.alerts.resourceUsed(resource.type === "currency")}
            </AppInfoAlert>
          ) : null}

          <AppResponsiveGrid columns={{ xs: 1, sm: 2, md: 12 }} gap={1.5} sx={{ alignItems: "flex-start" }}>
            <Box sx={{ gridColumn: { sm: "span 2", md: `span ${resource.type === "currency" ? 6 : 8}` } }}>
              <AppTextInput
                fullWidth
                size="small"
                label={projectTexts.resource.nameLabel}
                value={resource.label}
                disabled={disabled}
                onChange={(event) => onChange({ ...resource, label: event.target.value })}
              />
            </Box>

            {resource.type === "currency" ? (
              <>
                <Box sx={{ gridColumn: { md: "span 3" } }}>
                  <AppTextInput
                    select
                    fullWidth
                    size="small"
                    label={projectTexts.resource.valueTypeLabel}
                    value={resource.valueType}
                    disabled={currencyFormatLocked}
                    onChange={(event) => {
                      const valueType = event.target.value as ProjectCurrencyDraft["valueType"];
                      onChange({ ...resource, valueType, precision: valueType === "integer" ? 0 : resource.precision || 1 });
                    }}
                  >
                    <MenuItem value="integer">{projectTexts.resource.integerValueType}</MenuItem>
                    <MenuItem value="decimal">{projectTexts.resource.decimalValueType}</MenuItem>
                  </AppTextInput>
                </Box>
                <Box sx={{ gridColumn: { md: "span 3" } }}>
                  <AppTextInput
                    fullWidth
                    size="small"
                    type="number"
                    label={projectTexts.resource.precisionLabel}
                    value={resource.precision}
                    disabled={currencyFormatLocked || resource.valueType === "integer"}
                    inputProps={{ min: 0, max: 1, step: 1 }}
                    onChange={(event) => onChange({ ...resource, precision: Number(event.target.value) })}
                  />
                </Box>
              </>
            ) : null}
          </AppResponsiveGrid>

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{projectTexts.resource.previewTitle}</Typography>
              <Typography variant="caption" color="text.secondary">{projectTexts.resource.previewSubtitle}</Typography>
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
