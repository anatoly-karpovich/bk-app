import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import TollRoundedIcon from "@mui/icons-material/TollRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import type { ProjectResourceDraft } from "../projectPage.helpers";

interface ProjectResourceListProps {
  resources: ProjectResourceDraft[];
  selectedResourceId: string;
  disabled: boolean;
  onSelect: (resourceId: string) => void;
  onAddCurrency: () => void;
  onAddItem: () => void;
}

function getResourceMeta(resource: ProjectResourceDraft): string {
  const type = resource.type === "currency" ? "Валюта" : "Предмет";
  if (resource.isNew) return `${type} · новый ресурс`;
  return `${type} · ${resource.canDelete ? "не используется в конфигах" : "используется в конфигах"}`;
}

export default function ProjectResourceList({
  resources,
  selectedResourceId,
  disabled,
  onSelect,
  onAddCurrency,
  onAddItem,
}: ProjectResourceListProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
            <Box>
              <Typography variant="h5">Ресурсы</Typography>
              <Typography variant="body2" color="text.secondary">Выберите ресурс для редактирования</Typography>
            </Box>
            <Box
              aria-label={`Ресурсов: ${resources.length}`}
              sx={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText", fontSize: 12, fontWeight: 700 }}
            >
              {resources.length}
            </Box>
          </Stack>

          <Stack spacing={1}>
            {resources.map((resource) => {
              const selected = resource.id === selectedResourceId;
              const Icon = resource.type === "currency" ? TollRoundedIcon : DiamondRoundedIcon;

              return (
                <Box
                  key={resource.id}
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(resource.id)}
                  sx={{
                    width: "100%",
                    minHeight: 66,
                    px: 1.5,
                    py: 1.25,
                    border: "1px solid",
                    borderColor: selected ? "primary.light" : "divider",
                    borderRadius: 2,
                    bgcolor: selected ? "rgba(79, 70, 229, 0.06)" : "background.paper",
                    boxShadow: selected ? "0 0 0 2px rgba(79, 70, 229, 0.07)" : "none",
                    color: "text.primary",
                    display: "grid",
                    gridTemplateColumns: "38px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 1.5,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 160ms ease, background-color 160ms ease",
                    "&:hover": { borderColor: "primary.light" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
                  }}
                >
                  <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: "rgba(8, 145, 178, 0.12)", color: "secondary.dark" }}>
                    <Icon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{resource.label || "Новый ресурс"}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{getResourceMeta(resource)}</Typography>
                  </Box>
                  <ChevronRightRoundedIcon color="disabled" fontSize="small" />
                </Box>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={onAddCurrency}>Валюта</AppPillButton>
            <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={disabled} onClick={onAddItem}>Предмет</AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
