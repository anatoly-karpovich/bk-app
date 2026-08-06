import { Card, CardContent, Stack, Typography } from "@mui/material";
import GamePageHeader from "../../../components/GamePageHeader";
import type { Project } from "../../projects/types";

export default function QuizEventsPage({ selectedProject }: { selectedProject: Project | null }) {
  return (
    <Stack spacing={3}>
      <GamePageHeader breadcrumbPath="/quizzes" breadcrumbItems={[{ label: "Проведения" }]} title="Проведения викторин" description="Рабочее место проведения будет добавлено следующим этапом." chips={selectedProject ? [{ label: `Проект: ${selectedProject.name}` }] : []} />
      <Card><CardContent sx={{ py: 5, textAlign: "center" }}><Typography variant="h5">Проведения готовятся</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Подготовленные викторины уже можно создавать и редактировать.</Typography></CardContent></Card>
    </Stack>
  );
}
