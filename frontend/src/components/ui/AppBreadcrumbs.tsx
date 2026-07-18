import { Breadcrumbs, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface AppBreadcrumbsProps {
  items: string[];
  separator?: string;
  sx?: SxProps<Theme>;
  itemSx?: SxProps<Theme>;
}

export default function AppBreadcrumbs({ items, separator = "/", sx, itemSx }: AppBreadcrumbsProps) {
  return (
    <Breadcrumbs separator={separator} sx={sx}>
      {items.map((item) => (
        <Typography key={item} variant="caption" color="text.secondary" sx={itemSx}>
          {item}
        </Typography>
      ))}
    </Breadcrumbs>
  );
}
