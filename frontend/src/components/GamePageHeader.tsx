import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import AppBreadcrumbs from "./ui/AppBreadcrumbs";
import AppChip from "./ui/AppChip";
import AppPillButton from "./ui/AppPillButton";

export interface GamePageHeaderChip {
  label: string;
  color?: "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
}

export interface GamePageHeaderAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonProps["variant"];
  color?: ButtonProps["color"];
}

interface GamePageHeaderProps {
  breadcrumbs: string[];
  title: string;
  description: string;
  chips: GamePageHeaderChip[];
  actions: GamePageHeaderAction[];
  cardSx?: SxProps<Theme>;
}

export default function GamePageHeader({
  breadcrumbs,
  title,
  description,
  chips,
  actions,
  cardSx,
}: GamePageHeaderProps) {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.92)",
        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
        ...cardSx,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={3} justifyContent="space-between" alignItems={{ xl: "center" }}>
          <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: { xl: "62%" } }}>
            <AppBreadcrumbs items={breadcrumbs} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
              <Typography
                variant="h3"
                sx={{
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  fontSize: { xs: "2.1rem", md: "3rem" },
                }}
              >
                {title}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {chips.map((chip) => (
                  <AppChip key={chip.label} label={chip.label} color={chip.color} />
                ))}
              </Stack>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", xl: "auto" } }}>
            {actions.map((action) => (
              <AppPillButton
                key={action.key}
                variant={action.variant}
                color={action.color}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                loading={action.loading}
              >
                {action.label}
              </AppPillButton>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
