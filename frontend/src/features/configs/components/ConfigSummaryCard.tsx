import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";

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
          <Grid container spacing={1.25} sx={{ flex: 1, maxWidth: { lg: 720 } }}>
            {items.map((item) => (
              <Grid key={item.label} item xs={12} sm={6}>
                <Card variant="outlined" sx={{ boxShadow: "none", bgcolor: "rgba(248, 250, 252, 0.8)" }}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {item.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
