import { Box, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppTextInput from "../../../components/ui/AppTextInput";
import { projectTexts } from "../../../texts/projectTexts";
import { PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH } from "../projectPage.helpers";
import type { ProjectActivityTypeSettings } from "../types";

interface ProjectActivityTypesEditorProps {
  activityTypes: readonly ProjectActivityTypeSettings[];
  sourceActivityTypes: readonly ProjectActivityTypeSettings[];
  disabled: boolean;
  onChange: (activityTypes: ProjectActivityTypeSettings[]) => void;
}

function findSourceSetting(
  sourceActivityTypes: readonly ProjectActivityTypeSettings[],
  type: string,
): ProjectActivityTypeSettings | undefined {
  return sourceActivityTypes.find((setting) => setting.type === type);
}

export default function ProjectActivityTypesEditor({
  activityTypes,
  sourceActivityTypes,
  disabled,
  onChange,
}: ProjectActivityTypesEditorProps) {
  function updateSetting(type: string, patch: Partial<ProjectActivityTypeSettings>) {
    onChange(activityTypes.map((setting) => (setting.type === type ? { ...setting, ...patch } : setting)));
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{projectTexts.activityTypes.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {projectTexts.activityTypes.subtitle}
            </Typography>
          </Stack>

          <AppInfoAlert>{projectTexts.activityTypes.availabilityHint}</AppInfoAlert>

          <Stack spacing={2}>
            {activityTypes.map((setting, index) => {
              const sourceSetting = findSourceSetting(sourceActivityTypes, setting.type);
              const isTitleInvalid = !setting.defaultTitle.trim();

              return (
                <Box
                  key={setting.type}
                  sx={index === 0 ? undefined : { pt: 2, borderTop: "1px solid", borderColor: "divider" }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <AppChip label={setting.type} size="small" variant="outlined" />
                      <FormControlLabel
                        sx={{ mr: 0 }}
                        label={projectTexts.activityTypes.enabledLabel}
                        control={
                          <Switch
                            checked={setting.enabled}
                            disabled={disabled}
                            onChange={(_event, enabled) => updateSetting(setting.type, { enabled })}
                          />
                        }
                      />
                    </Stack>
                    <AppTextInput
                      fullWidth
                      size="small"
                      label={projectTexts.activityTypes.defaultTitleLabel}
                      value={setting.defaultTitle}
                      changed={Boolean(sourceSetting && sourceSetting.defaultTitle !== setting.defaultTitle)}
                      disabled={disabled}
                      error={isTitleInvalid}
                      helperText={isTitleInvalid ? projectTexts.activityTypes.defaultTitleRequired : undefined}
                      inputProps={{ maxLength: PROJECT_ACTIVITY_TYPE_DEFAULT_TITLE_MAX_LENGTH }}
                      onChange={(event) => updateSetting(setting.type, { defaultTitle: event.target.value })}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
