import { Alert, Card, CardContent, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { ResourceConfigUsage } from "../projectPage.helpers";

interface ProjectResourceUsageProps {
  usages: ResourceConfigUsage[];
  isLoading: boolean;
  error: string | null;
}

export default function ProjectResourceUsage({ usages, isLoading, error }: ProjectResourceUsageProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Использование в конфигах</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>Игры и пресеты, которые используют выбранный ресурс</Typography>

        {error ? <Alert severity="error">Не удалось загрузить список конфигов: {error}</Alert> : null}
        {isLoading ? <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 2 }} /> : null}
        {!isLoading && !error ? (
          <TableContainer sx={{ maxWidth: "100%" }}>
            <Table size="small" aria-label="Использование ресурса в конфигах">
              <TableHead>
                <TableRow>
                  <TableCell>Игра</TableCell>
                  <TableCell>Пресет</TableCell>
                  <TableCell>Использование</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usages.map((usage) => (
                  <TableRow key={`${usage.gameName}-${usage.configName}`}>
                    <TableCell>{usage.gameName}</TableCell>
                    <TableCell>{usage.configName}</TableCell>
                    <TableCell sx={{ color: "secondary.dark", fontWeight: 700 }}>{usage.usageLabel}</TableCell>
                  </TableRow>
                ))}
                {!usages.length ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: "text.secondary", textAlign: "center", py: 2.5 }}>Ресурс пока не используется в игровых конфигах.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </CardContent>
    </Card>
  );
}
