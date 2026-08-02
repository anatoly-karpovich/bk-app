import { journeyConfigTexts } from "../../../texts/journeyConfigTexts";
import type { Project } from "../../projects/types";
import { useGameConfigEditor } from "./useGameConfigEditor";

export function useJourneyConfigEditor(project: Project | null, configId: string | undefined, sourceConfigId?: string | null) {
  return useGameConfigEditor(project, configId, "journey", journeyConfigTexts.alerts, sourceConfigId);
}
