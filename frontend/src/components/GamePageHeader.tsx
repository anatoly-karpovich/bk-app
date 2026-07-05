import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import AppChip from "./ui/AppChip";
import AppPillButton from "./ui/AppPillButton";
import GameBreadcrumbs from "./GameBreadcrumbs";

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
  title: string;
  description: string;
  chips: GamePageHeaderChip[];
  actions: GamePageHeaderAction[];
  cardSx?: SxProps<Theme>;
}

export default function GamePageHeader({
  title,
  description,
  chips,
  actions,
  cardSx,
}: GamePageHeaderProps) {
  return (
    <Card
      sx={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(236, 253, 245, 0.92) 52%, rgba(224, 242, 254, 0.95) 100%)",
        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
        ...cardSx,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 64%) minmax(0, 36%)",
            },
            gap: 3,
            alignItems: { xl: "center" },
          }}
        >
          <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: { xl: "62%" } }}>
            <GameBreadcrumbs title={title} />
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
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            useFlexGap
            sx={{
              width: "100%",
              justifyContent: { xl: "flex-end" },
              justifySelf: { xl: "stretch" },
              flexWrap: "wrap",
            }}
          >
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
        </Box>
      </CardContent>
    </Card>
  );
}
