import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface AppSelectableListItemProps {
  primaryText: string;
  secondaryText: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
  ariaLabel?: string;
}

export default function AppSelectableListItem({
  primaryText,
  secondaryText,
  icon,
  selected,
  onClick,
  ariaLabel,
}: AppSelectableListItemProps) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
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
      <Box
        sx={{
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          borderRadius: 1.5,
          bgcolor: "rgba(8, 145, 178, 0.12)",
          color: "secondary.dark",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>{primaryText}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{secondaryText}</Typography>
      </Box>
      <ChevronRightRoundedIcon color="disabled" fontSize="small" />
    </Box>
  );
}
