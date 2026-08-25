import type { MouseEvent, ReactNode } from "react";
import AppPillButton from "../../../components/ui/AppPillButton";

interface AnalyticsSelectionPillProps {
  selected: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}

/** Keeps analytics choice controls visually quiet until they become the active selection. */
export default function AnalyticsSelectionPill({ selected, onClick, children }: AnalyticsSelectionPillProps) {
  return (
    <AppPillButton
      size="small"
      variant={selected ? "contained" : "text"}
      color={selected ? "primary" : "inherit"}
      onClick={onClick}
      sx={{
        minHeight: 34,
        px: 1.5,
        color: selected ? "primary.contrastText" : "text.secondary",
        backgroundColor: selected ? "primary.main" : "transparent",
        boxShadow: selected ? "0 6px 14px rgba(79, 70, 229, 0.20)" : "none",
        transition: "transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease, color 160ms ease",
        "&:hover": {
          color: selected ? "primary.contrastText" : "text.primary",
          backgroundColor: selected ? "primary.dark" : "rgba(79, 70, 229, 0.07)",
          boxShadow: selected ? "0 8px 18px rgba(79, 70, 229, 0.24)" : "none",
          transform: "translateY(-1px)",
        },
      }}
    >
      {children}
    </AppPillButton>
  );
}
