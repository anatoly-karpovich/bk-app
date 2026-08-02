import { Breadcrumbs, Link, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

export interface AppBreadcrumbItem {
  label: string;
  to?: string;
}

interface AppBreadcrumbsProps {
  items: AppBreadcrumbItem[];
  separator?: string;
  sx?: SxProps<Theme>;
  itemSx?: SxProps<Theme>;
}

export default function AppBreadcrumbs({ items, separator = "/", sx, itemSx }: AppBreadcrumbsProps) {
  return (
    <Breadcrumbs separator={separator} sx={sx}>
      {items.map((item, index) =>
        item.to ? (
          <Link
            key={`${item.label}-${item.to}`}
            component={RouterLink}
            to={item.to}
            variant="caption"
            color="text.secondary"
            underline="hover"
            sx={itemSx}
          >
            {item.label}
          </Link>
        ) : (
          <Typography key={`${item.label}-${index}`} variant="caption" color="text.secondary" sx={itemSx}>
            {item.label}
          </Typography>
        ),
      )}
    </Breadcrumbs>
  );
}
