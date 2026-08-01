import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Box, Card, CardContent, Grid, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { gameConfigsTexts } from "../../../texts/gameConfigsTexts";
import type { AnyGameConfig } from "../../projects/types";

interface ConfigSummaryItem {
  label: string;
  value: string;
}

function getSummaryItems(config: AnyGameConfig): ConfigSummaryItem[] {
  switch (config.gameType) {
    case "journey":
      return [
        {
          label: gameConfigsTexts.card.summary.journey.field,
          value: gameConfigsTexts.card.summary.journey.fieldValue(config.summary.mapSize),
        },
        { label: gameConfigsTexts.card.summary.journey.turn, value: config.summary.diceRange },
        { label: gameConfigsTexts.card.summary.journey.jackpot, value: config.summary.jackpot },
        {
          label: gameConfigsTexts.card.summary.journey.events,
          value: gameConfigsTexts.card.summary.journey.eventsValue(config.summary.bonusKinds, config.summary.trapKinds),
        },
      ];
    case "battleships":
      return [
        {
          label: gameConfigsTexts.card.summary.battleships.field,
          value: `${config.summary.boardSize}×${config.summary.boardSize}`,
        },
        { label: gameConfigsTexts.card.summary.battleships.shots, value: String(config.summary.maxShots) },
        { label: gameConfigsTexts.card.summary.battleships.hit, value: config.summary.hitPrizeLabel },
        { label: gameConfigsTexts.card.summary.battleships.fleet, value: config.summary.fleet.join(", ") },
      ];
    case "lotto":
      return [
        { label: gameConfigsTexts.card.summary.lotto.range, value: config.summary.range },
        {
          label: gameConfigsTexts.card.summary.lotto.card,
          value: gameConfigsTexts.card.summary.lotto.cardValue(config.summary.cardNumbersAmount),
        },
        { label: gameConfigsTexts.card.summary.lotto.firstPlace, value: config.summary.firstPlacePrizeLabel },
        { label: gameConfigsTexts.card.summary.lotto.secondPlace, value: config.summary.secondPlacePrizeLabel },
      ];
  }
}

interface GameConfigCardProps {
  config: AnyGameConfig;
  onOpen: (config: AnyGameConfig) => void;
}

export default function GameConfigCard({ config, onOpen }: GameConfigCardProps) {
  const summaryItems = getSummaryItems(config);
  const editAriaLabel = gameConfigsTexts.card.editAriaLabel(config.name);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">{config.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {config.description || gameConfigsTexts.card.noDescription}
            </Typography>
          </Box>
          <Tooltip title={editAriaLabel}>
            <IconButton
              aria-label={editAriaLabel}
              onClick={() => onOpen(config)}
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 1.75,
                bgcolor: "rgba(79, 70, 229, 0.1)",
                color: "primary.main",
                "&:hover": { bgcolor: "rgba(79, 70, 229, 0.16)" },
              }}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Grid container spacing={1} sx={{ mt: 0.75 }}>
          {summaryItems.map((item) => (
            <Grid key={item.label} item xs={12} sm={6}>
              <Box
                sx={{
                  minHeight: 54,
                  px: 1.25,
                  py: 0.875,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.75,
                  bgcolor: "rgba(248, 250, 252, 0.8)",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25, overflowWrap: "anywhere" }}>
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: "auto", pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {gameConfigsTexts.card.appliesToNewGames}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
