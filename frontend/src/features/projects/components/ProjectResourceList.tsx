import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import TollRoundedIcon from "@mui/icons-material/TollRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppSelectableListItem from "../../../components/ui/AppSelectableListItem";
import { projectTexts } from "../../../texts/projectTexts";
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
  return projectTexts.resource.meta(resource.type, resource.isNew ? "new" : resource.canDelete ? "unused" : "used");
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
              <Typography variant="h5">{projectTexts.resource.listTitle}</Typography>
              <Typography variant="body2" color="text.secondary">
                {projectTexts.resource.listSubtitle}
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1}>
            {resources.map((resource) => {
              const selected = resource.id === selectedResourceId;
              const Icon = resource.type === "currency" ? TollRoundedIcon : DiamondRoundedIcon;

              return (
                <AppSelectableListItem
                  key={resource.id}
                  ariaLabel={resource.label || projectTexts.resource.newResource}
                  primaryText={resource.label || projectTexts.resource.newResource}
                  secondaryText={getResourceMeta(resource)}
                  icon={<Icon fontSize="small" />}
                  selected={selected}
                  onClick={() => onSelect(resource.id)}
                />
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}
          >
            <AppPillButton
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              disabled={disabled}
              onClick={onAddCurrency}
            >
              {projectTexts.resource.addCurrency}
            </AppPillButton>
            <AppPillButton
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              disabled={disabled}
              onClick={onAddItem}
            >
              {projectTexts.resource.addItem}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
