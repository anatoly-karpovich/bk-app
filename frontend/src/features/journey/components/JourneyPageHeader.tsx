import { Card, CardContent, Stack, Typography } from "@mui/material";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppBreadcrumbs from "../../../components/ui/AppBreadcrumbs";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import type { JourneyStatusChip } from "../types";

interface JourneyPageHeaderProps {
  pageStatusChips: JourneyStatusChip[];
  canStartGame: boolean;
  hasGame: boolean;
  savedGameAvailable: boolean;
  onOpenRules: () => void;
  onStartGame: () => void;
  onRestoreGame: () => void;
  onRestartGame: () => void;
}

export default function JourneyPageHeader({
  pageStatusChips,
  canStartGame,
  hasGame,
  savedGameAvailable,
  onOpenRules,
  onStartGame,
  onRestoreGame,
  onRestartGame,
}: JourneyPageHeaderProps) {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.92)",
        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={3} justifyContent="space-between" alignItems={{ xl: "center" }}>
          <Stack spacing={1.25} sx={{ minWidth: 0, maxWidth: { xl: "60%" } }}>
            <AppBreadcrumbs items={journeyTexts.breadcrumbs.split(" / ")} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
              <Typography
                variant="h3"
                sx={{
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  fontSize: { xs: "2.1rem", md: "3rem" },
                }}
              >
                {journeyTexts.pageTitle}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {pageStatusChips.map((chip) => (
                  <AppChip key={chip.label} label={chip.label} color={chip.color} />
                ))}
              </Stack>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              {journeyTexts.pageDescription}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", xl: "auto" } }}>
            <AppPillButton variant="outlined" startIcon={<MenuBookRoundedIcon />} onClick={onOpenRules}>
              {journeyTexts.actions.rules}
            </AppPillButton>
            <AppPillButton variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={onStartGame} disabled={hasGame || !canStartGame}>
              {journeyTexts.actions.newGame}
            </AppPillButton>
            <AppPillButton variant="outlined" startIcon={<RestoreRoundedIcon />} onClick={onRestoreGame} disabled={!savedGameAvailable}>
              {journeyTexts.actions.restore}
            </AppPillButton>
            <AppPillButton variant="text" color="inherit" startIcon={<AutorenewRoundedIcon />} onClick={onRestartGame}>
              {journeyTexts.actions.reset}
            </AppPillButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
