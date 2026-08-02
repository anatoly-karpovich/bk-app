import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface RuleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function RuleSection({ title, description, children }: RuleSectionProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2.25}>
        <Stack spacing={0.5}>
          <Typography variant="h5">{title}</Typography>
          {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
        </Stack>
        {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
