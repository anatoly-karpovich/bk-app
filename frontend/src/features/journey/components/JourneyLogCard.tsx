import { Box, Card, CardContent, CardHeader } from "@mui/material";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyLogCardProps {
  comments?: string[];
}

function formatLogLine(line: string): string {
  if (!line || line.startsWith("====================") || line.startsWith("- ")) {
    return line;
  }

  return `- ${line}`;
}

export default function JourneyLogCard({ comments = [] }: JourneyLogCardProps) {
  const logText = comments
    .flatMap((comment) => comment.split("\n"))
    .map(formatLogLine)
    .join("\n");

  return (
    <Card>
      <CardHeader title={journeyTexts.cards.logTitle} subheader={journeyTexts.cards.logSubtitle} />
      <CardContent>
        {comments.length ? (
          <Box
            sx={{
              p: 2,
              borderRadius: (theme) => theme.customRadii.surface,
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              whiteSpace: "pre-wrap",
              maxHeight: 520,
              overflowY: "auto",
            }}
          >
            {logText}
          </Box>
        ) : (
          <AppInfoAlert>
            {journeyTexts.alerts.logEmpty}
          </AppInfoAlert>
        )}
      </CardContent>
    </Card>
  );
}
