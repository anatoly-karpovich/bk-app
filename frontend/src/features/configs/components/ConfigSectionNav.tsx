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
  onSelect: (section: TSectionId) => void;
}

export default function ConfigSectionNav<TSectionId extends string>({
  heading,
  description,
  changedHint,
  sections,
  activeSection,
  changedSections,
  onSelect,
}: ConfigSectionNavProps<TSectionId>) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h5">{heading}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            {sections.map((section) => {
              const changed = changedSections.includes(section.id);
              return (
                <AppSelectableListItem
                  key={section.id}
                  primaryText={section.label}
                  secondaryText={section.description}
                  icon={section.icon}
                  selected={section.id === activeSection}
                  onClick={() => onSelect(section.id)}
                  trailing={
                    changed ? (
                      <Box
                        aria-label="Раздел изменён"
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          fontSize: 14,
                          fontWeight: 800,
                        }}
                      >
                        !
                      </Box>
                    ) : undefined
                  }
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
