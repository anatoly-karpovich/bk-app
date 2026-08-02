import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface RuleSectionProps {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export default function RuleSection({ title, description, headerAction, children }: RuleSectionProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2.25}>
        <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.5}>
            <Typography variant="h5">{title}</Typography>
            {description ? <Typography variant="body2" color="text.secondary">{description}</Typography> : null}
          </Stack>
          {headerAction}
        </Stack>
        {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
