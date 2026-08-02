import { Card, CardContent, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import type { ProjectResource } from "../../projects/types";

interface ConfigEditorWorkspaceHeaderProps {
  title: string;
  description: string;
  resources: readonly ProjectResource[];
}

export default function ConfigEditorWorkspaceHeader({
  title,
  description,
  resources,
}: ConfigEditorWorkspaceHeaderProps) {
  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          spacing={2}
        >
          <Stack spacing={0.5}>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
          {resources.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ md: "flex-end" }}>
              {resources.map((resource) => (
                <AppChip
                  key={resource.id}
                  size="small"
                  label={`${resource.label} · ${resource.type === "currency" ? "валюта" : "предмет"}`}
                  color="primary"
                  sx={{ bgcolor: "rgba(79, 70, 229, 0.1)", color: "primary.dark", fontWeight: 700 }}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
