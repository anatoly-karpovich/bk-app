import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TollRoundedIcon from "@mui/icons-material/TollRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";
import type { ConfigSection, JourneyConfigPageSectionId } from "../types";
import ConfigSectionNav from "./ConfigSectionNav";

const sections: readonly ConfigSection<JourneyConfigPageSectionId>[] = [
  { id: "general", icon: <SettingsRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.general },
  { id: "map", icon: <MapRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.map },
  { id: "rewards", icon: <TollRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.rewards },
  { id: "jackpot", icon: <EmojiEventsRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.jackpot },
  { id: "cells", icon: <WorkspacePremiumRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.cells },
  { id: "achievements", icon: <StarRoundedIcon fontSize="small" />, ...journeyConfigTexts.sections.achievements },
];

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
    <ConfigSectionNav
      heading={journeyConfigTexts.sections.heading}
      description={journeyConfigTexts.sections.description}
      changedHint={journeyConfigTexts.sections.changedHint}
      sections={sections}
      activeSection={activeSection}
      changedSections={changedSections}
      onSelect={onSelect}
    />
  );
}
