import { Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface RuleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function RuleSection({ title, description, children }: RuleSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">{title}</Typography>
          {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
