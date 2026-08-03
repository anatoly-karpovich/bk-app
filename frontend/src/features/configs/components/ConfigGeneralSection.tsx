import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
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
  children?: ReactNode;
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
  children,
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
          <AppResponsiveGrid columns={{ xs: 1, md: 2 }}>
              <AppTextInput
                fullWidth
                label={nameLabel}
                value={draft.name}
                changed={draft.name !== source.name}
                disabled={disabled}
                required
                onChange={(event) => onChange({ name: event.target.value })}
              />
              <AppTextInput
                fullWidth
                label={descriptionLabel}
                value={draft.description}
                changed={draft.description !== source.description}
                disabled={disabled}
                onChange={(event) => onChange({ description: event.target.value })}
              />
              {children}
          </AppResponsiveGrid>
        </Stack>
      </CardContent>
    </Card>
  );
}
