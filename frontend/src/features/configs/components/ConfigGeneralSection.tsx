import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import AppTextInput from "../../../components/ui/AppTextInput";

interface ConfigGeneralSectionProps {
  title: string;
  description: string;
  nameLabel: string;
  descriptionLabel: string;
  source: { name: string; description: string };
  draft: { name: string; description: string };
  disabled: boolean;
  onChange: (patch: { name?: string; description?: string }) => void;
}

export default function ConfigGeneralSection({
  title,
  description,
  nameLabel,
  descriptionLabel,
  source,
  draft,
  disabled,
  onChange,
}: ConfigGeneralSectionProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <AppTextInput
                fullWidth
                label={nameLabel}
                value={draft.name}
                changed={draft.name !== source.name}
                disabled={disabled}
                required
                onChange={(event) => onChange({ name: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextInput
                fullWidth
                label={descriptionLabel}
                value={draft.description}
                changed={draft.description !== source.description}
                disabled={disabled}
                onChange={(event) => onChange({ description: event.target.value })}
              />
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
