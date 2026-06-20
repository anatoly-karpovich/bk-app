import { Breadcrumbs, Typography } from "@mui/material";

export default function AppBreadcrumbs({ items, separator = "/", sx, itemSx }) {
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
