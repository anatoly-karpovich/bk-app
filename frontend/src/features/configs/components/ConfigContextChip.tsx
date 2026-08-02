import type { ReactNode } from "react";
import AppChip from "../../../components/ui/AppChip";

interface ConfigContextChipProps {
  label: string;
  icon: ReactNode;
}

export default function ConfigContextChip({ label, icon }: ConfigContextChipProps) {
  return (
    <AppChip
      size="small"
      icon={icon}
      label={label}
      sx={{
        alignSelf: "flex-start",
        bgcolor: "rgba(79, 70, 229, 0.09)",
        color: "primary.dark",
        fontWeight: 700,
        "& .MuiChip-icon": { color: "primary.main" },
      }}
    />
  );
}
