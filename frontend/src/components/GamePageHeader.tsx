import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import AppChip from "./ui/AppChip";
import type { AppBreadcrumbItem } from "./ui/AppBreadcrumbs";
import AppPillButton from "./ui/AppPillButton";
import GamePageHeaderMoreMenu from "./GamePageHeaderMoreMenu";
import type { GamePageHeaderMoreAction } from "./GamePageHeaderMoreMenu";
import PageBreadcrumbs from "./PageBreadcrumbs";

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
  breadcrumbPath: string;
  breadcrumbItems?: AppBreadcrumbItem[];
  title: string;
  description?: string;
  chips?: GamePageHeaderChip[];
  actions?: GamePageHeaderAction[];
  moreActions?: GamePageHeaderMoreAction[];
  moreActionsDisabled?: boolean;
  controls?: ReactNode;
  footer?: ReactNode;
  cardSx?: SxProps<Theme>;
}

export default function GamePageHeader({
  breadcrumbPath,
  breadcrumbItems,
  title,
  description,
  chips = [],
  actions = [],
  moreActions = [],
  moreActionsDisabled = false,
  controls,
  footer,
  cardSx,
}: GamePageHeaderProps) {
  const hasTrailingContent = Boolean(controls || actions.length || moreActions.length);

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
              xl: hasTrailingContent ? "minmax(0, 58%) minmax(0, 42%)" : "minmax(0, 1fr)",
            },
            gap: 3,
            alignItems: { xl: "center" },
          }}
        >
          <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: { xl: hasTrailingContent ? "62%" : "100%" } }}>
            <PageBreadcrumbs pagePath={breadcrumbPath} additionalItems={breadcrumbItems} />
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
            {chips.length ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {chips.map((chip, index) => (
                  <AppChip key={`${chip.label}-${index}`} label={chip.label} color={chip.color} />
                ))}
              </Stack>
            ) : null}
            {description ? (
              <Typography variant="body1" color="text.secondary">
                {description}
              </Typography>
            ) : null}
            {footer}
          </Stack>

          {hasTrailingContent ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              useFlexGap
              sx={{
                width: "100%",
                justifyContent: { xl: "flex-end" },
                justifySelf: { xl: "stretch" },
                flexWrap: { xs: "wrap", xl: "nowrap" },
                alignItems: { sm: "center" },
                "@media (min-width: 600px) and (max-width: 1199.95px)": {
                  "& .game-page-header-more-actions": {
                    order: 1,
                  },
                  "& .game-page-header-action-saved-games": {
                    order: 2,
                    flexBasis: "100%",
                  },
                },
              }}
            >
              {controls ? (
                <Box
                  sx={{
                    width: { xs: "100%", sm: 220, xl: 210 },
                    maxWidth: "100%",
                    flexShrink: 0,
                  }}
                >
                  {controls}
                </Box>
              ) : null}

              {actions.map((action) => (
                <Box key={action.key} className={`game-page-header-action-${action.key}`} sx={{ display: "flex" }}>
                  <AppPillButton
                    variant={action.variant}
                    color={action.color}
                    startIcon={action.icon}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    loading={action.loading}
                  >
                    {action.label}
                  </AppPillButton>
                </Box>
              ))}
              {moreActions.length ? (
                <Box className="game-page-header-more-actions" sx={{ display: "flex" }}>
                  <GamePageHeaderMoreMenu actions={moreActions} disabled={moreActionsDisabled} />
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
