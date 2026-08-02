import { Box } from "@mui/material";
import type { BoxProps, Breakpoint, Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import type { ReactNode } from "react";

type ResponsiveColumns = Partial<Record<Breakpoint, number>>;

interface AppResponsiveGridProps extends Omit<BoxProps, "children" | "sx"> {
  columns: ResponsiveColumns;
  gap?: number;
  children: ReactNode;
  sx?: SystemStyleObject<Theme>;
}

function toGridTemplateColumns(columns: ResponsiveColumns) {
  return Object.fromEntries(
    Object.entries(columns).map(([breakpoint, count]) => [breakpoint, `repeat(${count}, minmax(0, 1fr))`]),
  );
}

export default function AppResponsiveGrid({ columns, gap = 2, children, sx, ...props }: AppResponsiveGridProps) {
  return (
    <Box
      {...props}
      sx={[
        {
          display: "grid",
          gridTemplateColumns: toGridTemplateColumns(columns),
          gap,
        },
        sx,
      ]}
    >
      {children}
    </Box>
  );
}
