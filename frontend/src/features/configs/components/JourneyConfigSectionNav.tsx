import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TollRoundedIcon from "@mui/icons-material/TollRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../../components/ui/AppSelectableListItem";
import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";
import type { JourneyConfigSectionId } from "./JourneyConfigEditor";

export type JourneyConfigPageSectionId = "general" | JourneyConfigSectionId;

const sectionIcons: Record<JourneyConfigPageSectionId, typeof SettingsRoundedIcon> = {
  general: SettingsRoundedIcon,
  map: MapRoundedIcon,
  rewards: TollRoundedIcon,
  jackpot: EmojiEventsRoundedIcon,
  cells: WorkspacePremiumRoundedIcon,
  achievements: StarRoundedIcon,
};

const sectionIds: JourneyConfigPageSectionId[] = ["general", "map", "rewards", "jackpot", "cells", "achievements"];

interface JourneyConfigSectionNavProps {
  activeSection: JourneyConfigPageSectionId;
  changedSections: readonly JourneyConfigPageSectionId[];
  onSelect: (section: JourneyConfigPageSectionId) => void;
}

export default function JourneyConfigSectionNav({
  activeSection,
  changedSections,
  onSelect,
}: JourneyConfigSectionNavProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">{journeyConfigTexts.sections.heading}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {journeyConfigTexts.sections.description}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            {sectionIds.map((section) => {
              const Icon = sectionIcons[section];
              const copy = journeyConfigTexts.sections[section];
              const changed = changedSections.includes(section);

              return (
                <AppSelectableListItem
                  key={section}
                  primaryText={copy.label}
                  secondaryText={copy.description}
                  icon={<Icon fontSize="small" />}
                  selected={section === activeSection}
                  onClick={() => onSelect(section)}
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

          <AppInfoAlert>{journeyConfigTexts.sections.changedHint}</AppInfoAlert>
        </Stack>
      </CardContent>
    </Card>
  );
}
