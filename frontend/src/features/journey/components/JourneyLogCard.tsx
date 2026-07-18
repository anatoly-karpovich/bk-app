import { Alert, Box, Card, CardContent, CardHeader } from "@mui/material";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import { journeyTexts } from "../../../texts/journeyTexts";

interface JourneyLogCardProps {
  comments?: string[];
}

export default function JourneyLogCard({ comments = [] }: JourneyLogCardProps) {
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
            {comments.join("\n")}
          </Box>
        ) : (
          <Alert severity="info" icon={<TravelExploreRoundedIcon fontSize="inherit" />}>
            {journeyTexts.alerts.logEmpty}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
