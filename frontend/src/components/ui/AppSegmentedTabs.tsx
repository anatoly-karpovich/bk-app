import { Tabs, Tab } from "@mui/material";

interface AppSegmentedTab {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AppSegmentedTabsProps {
  value: string;
  tabs: readonly AppSegmentedTab[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function AppSegmentedTabs({ value, tabs, disabled = false, onChange }: AppSegmentedTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(_event, nextValue) => onChange(nextValue)}
      aria-label="Переключатель режима"
      sx={{
        minHeight: 40,
        alignSelf: "flex-start",
        "& .MuiTabs-flexContainer": { gap: 1 },
        "& .MuiTabs-indicator": { display: "none" },
        "& .MuiTab-root": {
          minHeight: 40,
          minWidth: 0,
          px: 1.75,
          py: 0.75,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 999,
          color: "text.primary",
          fontSize: "0.8125rem",
          fontWeight: 700,
          textTransform: "none",
        },
        "& .MuiTab-root.Mui-selected": {
          borderColor: "primary.main",
          bgcolor: "rgba(79, 70, 229, 0.08)",
          color: "primary.main",
        },
      }}
    >
      {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} disabled={disabled || tab.disabled} />)}
    </Tabs>
  );
}
