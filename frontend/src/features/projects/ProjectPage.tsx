import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Card, CardContent, Chip, Divider, Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import PageBreadcrumbs from "../../components/PageBreadcrumbs";
import AppPillButton from "../../components/ui/AppPillButton";
import AppTextInput from "../../components/ui/AppTextInput";
import type { Project, ProjectCurrency, ProjectItem, ProjectMutationInput } from "./types";

type ProjectCurrencyDraft = Omit<ProjectCurrency, "createdAt" | "updatedAt"> & { isNew: boolean };
type ProjectItemDraft = Omit<ProjectItem, "createdAt" | "updatedAt"> & { isNew: boolean };
type ProjectResourceDraft = ProjectCurrencyDraft | ProjectItemDraft;

interface ProjectDraft {
  name: string;
  description: string;
  resources: ProjectResourceDraft[];
}

interface ProjectPageProps {
  selectedProject: Project | null;
  error: string | null;
  isSaving: boolean;
  onUpdateProject: (projectId: string, input: ProjectMutationInput) => Promise<Project | null>;
}

function createResourceId(): string {
  return `resource_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    description: project.description,
    resources: project.resources.map((resource) => ({ ...resource, isNew: false })),
  };
}

function createCurrencyDraft(): ProjectCurrencyDraft {
  const id = createResourceId();

  return {
    type: "currency",
    id,
    code: id,
    name: "",
    label: "",
    valueType: "integer",
    precision: 0,
    canDelete: true,
    isNew: true,
  };
}

function createItemDraft(): ProjectItemDraft {
  const id = createResourceId();

  return {
    type: "item",
    id,
    code: id,
    name: "",
    label: "",
    canDelete: true,
    isNew: true,
  };
}

function toMutationInput(project: Project, draft: ProjectDraft): ProjectMutationInput {
  return {
    code: project.code,
    name: draft.name.trim(),
    description: draft.description.trim(),
    resources: draft.resources.map(({ isNew: _isNew, canDelete: _canDelete, ...resource }) => ({
      ...resource,
      name: resource.label.trim(),
    })),
  };
}

function isDraftValid(draft: ProjectDraft): boolean {
  const resourceIds = new Set<string>();
  const resourceCodes = new Set<string>();

  if (!draft.name.trim() || !draft.resources.length) {
    return false;
  }

  return draft.resources.every((resource) => {
    const id = resource.id.trim();
    const code = resource.code.trim();
    if (!id || !code || !resource.label.trim() || resourceIds.has(id) || resourceCodes.has(code)) {
      return false;
    }

    resourceIds.add(id);
    resourceCodes.add(code);

    return resource.type !== "currency" || (
      (resource.valueType === "integer" && resource.precision === 0) ||
      (resource.valueType === "decimal" && Number.isInteger(resource.precision) && resource.precision >= 0 && resource.precision <= 1)
    );
  });
}

function ProjectResourceEditor({
  resource,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  resource: ProjectResourceDraft;
  disabled: boolean;
  canRemove: boolean;
  onChange: (resource: ProjectResourceDraft) => void;
  onRemove: () => void;
}) {
  const isUsedByConfig = !resource.isNew && !resource.canDelete;
  const currencyFormatLocked = disabled || isUsedByConfig;

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 720, alignSelf: "flex-start" }}>
      <CardContent sx={{ p: { xs: 1.75, sm: 2 }, "&:last-child": { pb: { xs: 1.75, sm: 2 } } }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6">{resource.type === "currency" ? "Валюта" : "Предмет"}</Typography>
              {isUsedByConfig ? <Chip size="small" color="info" label="Используется в конфигах" /> : null}
              {resource.isNew ? <Chip size="small" color="success" label="Новый ресурс" /> : null}
            </Stack>
            <IconButton aria-label={`Удалить ресурс ${resource.label || resource.code || resource.id}`} color="error" disabled={!canRemove || disabled} onClick={onRemove}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Stack>

          {isUsedByConfig ? (
            <Alert severity="info" sx={{ py: 0.25 }}>
              Этот ресурс используется в игровом конфиге. Его нельзя удалить{resource.type === "currency" ? " или изменить формат валюты." : "."}
            </Alert>
          ) : null}

          <Grid container spacing={1.25} alignItems="flex-start">
            <Grid item xs={12} sm={resource.type === "currency" ? 6 : 8}>
              <AppTextInput fullWidth size="small" label="Название" value={resource.label} disabled={disabled} onChange={(event) => onChange({ ...resource, label: event.target.value })} />
            </Grid>

            {resource.type === "currency" ? (
              <>
                <Grid item xs={12} sm={3}>
                  <AppTextInput
                    select
                    fullWidth
                    size="small"
                    label="Формат суммы"
                    value={resource.valueType}
                    disabled={currencyFormatLocked}
                    onChange={(event) => {
                      const valueType = event.target.value as ProjectCurrencyDraft["valueType"];
                      onChange({ ...resource, valueType, precision: valueType === "integer" ? 0 : resource.precision || 1 });
                    }}
                  >
                    <MenuItem value="integer">Целая</MenuItem>
                    <MenuItem value="decimal">Десятичная</MenuItem>
                  </AppTextInput>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <AppTextInput
                    fullWidth
                    size="small"
                    type="number"
                    label="Знаков после запятой"
                    value={resource.precision}
                    disabled={currencyFormatLocked || resource.valueType === "integer"}
                    inputProps={{ min: 0, max: 1, step: 1 }}
                    onChange={(event) => onChange({ ...resource, precision: Number(event.target.value) })}
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Предметы отображаются в играх как «{resource.label || "Название предмета"} ×1».</Typography>
              </Grid>
            )}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ProjectPage({ selectedProject, error, isSaving, onUpdateProject }: ProjectPageProps) {
  const [draft, setDraft] = useState<ProjectDraft | null>(selectedProject ? toDraft(selectedProject) : null);
  const canSave = useMemo(() => draft !== null && isDraftValid(draft), [draft]);

  useEffect(() => {
    setDraft(selectedProject ? toDraft(selectedProject) : null);
  }, [selectedProject]);

  if (!selectedProject || !draft) {
    return <Alert severity="warning">Выберите проект, чтобы изменить его параметры и ресурсы.</Alert>;
  }

  function updateResource(index: number, nextResource: ProjectResourceDraft) {
    setDraft((current) => current ? { ...current, resources: current.resources.map((resource, resourceIndex) => resourceIndex === index ? nextResource : resource) } : current);
  }

  async function saveProject() {
    if (!canSave) {
      return;
    }

    await onUpdateProject(selectedProject.id, toMutationInput(selectedProject, draft));
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
        <Box>
          <PageBreadcrumbs pagePath="/project" />
          <Typography variant="h4" sx={{ mt: 1 }}>Настройки проекта</Typography>
          <Typography color="text.secondary">Настройте общие сведения и каталог ресурсов для новых игровых конфигов.</Typography>
        </Box>
        <AppPillButton startIcon={<SaveRoundedIcon />} loading={isSaving} disabled={!canSave} onClick={() => void saveProject()}>Сохранить изменения</AppPillButton>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Сведения о проекте</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <AppTextInput fullWidth label="Название" value={draft.name} disabled={isSaving} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextInput fullWidth label="Код проекта" value={selectedProject.code} disabled helperText="Код проекта неизменяем." />
              </Grid>
              <Grid item xs={12}>
                <AppTextInput fullWidth multiline minRows={3} label="Описание" value={draft.description} disabled={isSaving} onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)} />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Divider />

      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
          <Box>
            <Typography variant="h5">Ресурсы</Typography>
            <Typography variant="body2" color="text.secondary">Ресурсы используются в пулах наград игровых конфигов. У игры остаётся собственный снимок ресурсов.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={isSaving} onClick={() => setDraft((current) => current ? { ...current, resources: [...current.resources, createCurrencyDraft()] } : current)}>Валюта</AppPillButton>
            <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={isSaving} onClick={() => setDraft((current) => current ? { ...current, resources: [...current.resources, createItemDraft()] } : current)}>Предмет</AppPillButton>
          </Stack>
        </Stack>

        <Grid container spacing={1.5} sx={{ maxWidth: 1464 }}>
          {draft.resources.map((resource, index) => (
            <Grid key={resource.id} item xs={12} md={6} sx={{ display: "flex" }}>
              <ProjectResourceEditor
                resource={resource}
                disabled={isSaving}
                canRemove={resource.canDelete && draft.resources.length > 1}
                onChange={(nextResource) => updateResource(index, nextResource)}
                onRemove={() => setDraft((current) => current ? { ...current, resources: current.resources.filter((_resource, resourceIndex) => resourceIndex !== index) } : current)}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
