import { Card, CardContent, Stack, Typography } from "@mui/material";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";

interface ConfigSummaryItem {
  label: string;
  value: string;
}

interface ConfigSummaryCardProps {
  title: string;
  description: string;
  items: readonly ConfigSummaryItem[];
}

export default function ConfigSummaryCard({ title, description, items }: ConfigSummaryCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ lg: "center" }} spacing={2.25}>
          <Stack spacing={0.25} sx={{ maxWidth: { lg: 360 } }}>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
          <AppResponsiveGrid columns={{ xs: 1, sm: 2, xl: 3 }} gap={1.25} sx={{ flex: 1, maxWidth: { lg: 960 } }}>
            {items.map((item) => (
              <Card key={item.label} variant="outlined" sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.8)" }}>
                <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </AppResponsiveGrid>
        </Stack>
      </CardContent>
    </Card>
  );
}
