import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../../components/ui/AppSelectableListItem";
import type { ConfigSection } from "../types";

interface ConfigSectionNavProps<TSectionId extends string> {
  heading: string;
  description: string;
  changedHint: string;
  sections: readonly ConfigSection<TSectionId>[];
  activeSection: TSectionId;
  changedSections: readonly TSectionId[];
  warningSections?: readonly TSectionId[];
  readySections?: readonly TSectionId[];
  onSelect: (section: TSectionId) => void;
}

export default function ConfigSectionNav<TSectionId extends string>({
  heading,
  description,
  changedHint,
  sections,
  activeSection,
  changedSections,
  warningSections = [],
  readySections = [],
  onSelect,
}: ConfigSectionNavProps<TSectionId>) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{heading}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Stack>

          <Stack spacing={1}>
            {sections.map((section) => {
              const changed = changedSections.includes(section.id);
              const warning = warningSections.includes(section.id);
              const ready = readySections.includes(section.id);
              const statusColor = changed ? "primary.main" : warning ? "warning.main" : ready ? "success.main" : "transparent";
              const statusLabel = changed ? "Раздел изменён" : warning ? "Раздел требует заполнения" : "Раздел готов";

              return (
                <AppSelectableListItem
                  key={section.id}
                  primaryText={section.label}
                  secondaryText={section.description}
                  icon={section.icon}
                  selected={section.id === activeSection}
                  onClick={() => onSelect(section.id)}
                  trailing={changed || warning || ready ? (
                    <Box
                      aria-label={statusLabel}
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: statusColor,
                        boxShadow: changed ? "0 0 0 3px rgba(79, 70, 229, 0.12)" : "none",
                      }}
                    />
                  ) : undefined}
                />
              );
            })}
          </Stack>

          <AppInfoAlert>{changedHint}</AppInfoAlert>
        </Stack>
      </CardContent>
    </Card>
  );
}
