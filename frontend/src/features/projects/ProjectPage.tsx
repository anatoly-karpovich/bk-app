import { useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import GamePageHeader from "../../components/GamePageHeader";
import AppInfoAlert from "../../components/ui/AppInfoAlert";
import AppTextInput from "../../components/ui/AppTextInput";
import { projectTexts } from "../../texts/projectTexts";
import { useGameConfigs } from "../configs/hooks/useGameConfigs";
import ProjectResourceEditor from "./components/ProjectResourceEditor";
import ProjectResourceList from "./components/ProjectResourceList";
import ProjectResourceUsage from "./components/ProjectResourceUsage";
import {
  createCurrencyDraft,
  createItemDraft,
  getResourceConfigUsages,
  isProjectDraftValid,
  toProjectDraft,
  toProjectMutationInput,
  type ProjectDraft,
  type ProjectResourceDraft,
} from "./projectPage.helpers";
import type { Project, ProjectMutationInput } from "./types";

interface ProjectPageProps {
  selectedProject: Project | null;
  canEdit: boolean;
  error: string | null;
  isSaving: boolean;
  onUpdateProject: (projectId: string, input: ProjectMutationInput) => Promise<Project | null>;
}

export default function ProjectPage({ selectedProject, canEdit, error, isSaving, onUpdateProject }: ProjectPageProps) {
  const [draft, setDraft] = useState<ProjectDraft | null>(selectedProject ? toProjectDraft(selectedProject) : null);
  const [selectedResourceId, setSelectedResourceId] = useState(selectedProject?.resources[0]?.id ?? "");
  const { gameConfigs, error: configsError, isLoading: isLoadingConfigs } = useGameConfigs(selectedProject?.id);
  const canSave = useMemo(() => draft !== null && isProjectDraftValid(draft), [draft]);
  const selectedResource =
    draft?.resources.find((resource) => resource.id === selectedResourceId) ?? draft?.resources[0] ?? null;
  const resourceUsages = useMemo(
    () => (selectedResource ? getResourceConfigUsages(selectedResource.id, gameConfigs) : []),
    [gameConfigs, selectedResource],
  );

  useEffect(() => {
    const nextDraft = selectedProject ? toProjectDraft(selectedProject) : null;
    setDraft(nextDraft);
    setSelectedResourceId(nextDraft?.resources[0]?.id ?? "");
  }, [selectedProject]);

  if (!selectedProject || !draft || !selectedResource) {
    return <Alert severity="warning">{projectTexts.alerts.projectRequired}</Alert>;
  }

  function updateResource(nextResource: ProjectResourceDraft) {
    setDraft((current) =>
      current
        ? {
            ...current,
            resources: current.resources.map((resource) => (resource.id === nextResource.id ? nextResource : resource)),
          }
        : current,
    );
  }

  function addResource(resource: ProjectResourceDraft) {
    setDraft((current) => (current ? { ...current, resources: [...current.resources, resource] } : current));
    setSelectedResourceId(resource.id);
  }

  function removeSelectedResource() {
    const nextResources = draft.resources.filter((resource) => resource.id !== selectedResource.id);
    setDraft({ ...draft, resources: nextResources });
    setSelectedResourceId(nextResources[0]?.id ?? "");
  }

  function resetDraft() {
    const nextDraft = toProjectDraft(selectedProject);
    setDraft(nextDraft);
    setSelectedResourceId(
      nextDraft.resources.find((resource) => resource.id === selectedResourceId)?.id ??
        nextDraft.resources[0]?.id ??
        "",
    );
  }

  async function saveProject() {
    if (!canEdit || !canSave) {
      return;
    }

    await onUpdateProject(selectedProject.id, toProjectMutationInput(selectedProject, draft));
  }

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12}>
        <GamePageHeader
          breadcrumbPath="/project"
          title={projectTexts.page.title}
          description={projectTexts.page.description}
          chips={[
            { label: projectTexts.page.projectChip(selectedProject.name) },
            { label: projectTexts.page.resourcesChip(draft.resources.length), color: "secondary" },
          ]}
          actions={[
            {
              key: "save",
              label: projectTexts.page.save,
              icon: <SaveRoundedIcon />,
              onClick: () => void saveProject(),
              disabled: !canEdit || !canSave,
              loading: isSaving,
              variant: "contained",
            },
            {
              key: "reset",
              label: projectTexts.page.reset,
              icon: <RefreshRoundedIcon />,
              onClick: resetDraft,
              disabled: !canEdit || isSaving,
              variant: "text",
              color: "inherit",
            },
          ]}
        />
      </Grid>

      {error ? (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      ) : null}
      {!canEdit ? (
        <Grid item xs={12}>
          <AppInfoAlert>{projectTexts.alerts.projectUpdateForbidden}</AppInfoAlert>
        </Grid>
      ) : null}

      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack spacing={0.25}>
                  <Typography variant="h5">{projectTexts.projectDetails.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {projectTexts.projectDetails.subtitle}
                  </Typography>
                </Stack>
                <AppTextInput
                  fullWidth
                  size="small"
                  label={projectTexts.projectDetails.nameLabel}
                  value={draft.name}
                  disabled={!canEdit || isSaving}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                  }
                />
                <AppTextInput
                  fullWidth
                  size="small"
                  label={projectTexts.projectDetails.codeLabel}
                  value={selectedProject.code}
                  disabled
                  helperText={projectTexts.projectDetails.codeHelper}
                />
                <AppTextInput
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  label={projectTexts.projectDetails.descriptionLabel}
                  value={draft.description}
                  disabled={!canEdit || isSaving}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, description: event.target.value } : current))
                  }
                />
              </Stack>
            </CardContent>
          </Card>

          <ProjectResourceList
            resources={draft.resources}
            selectedResourceId={selectedResource.id}
            disabled={!canEdit || isSaving}
            onSelect={setSelectedResourceId}
            onAddCurrency={() => addResource(createCurrencyDraft())}
            onAddItem={() => addResource(createItemDraft())}
          />
        </Stack>
      </Grid>

      <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          <ProjectResourceEditor
            resource={selectedResource}
            disabled={!canEdit || isSaving}
            canRemove={selectedResource.canDelete && draft.resources.length > 1}
            onChange={updateResource}
            onRemove={removeSelectedResource}
          />
          <ProjectResourceUsage usages={resourceUsages} isLoading={isLoadingConfigs} error={configsError} />
        </Stack>
      </Grid>
    </Grid>
  );
}
