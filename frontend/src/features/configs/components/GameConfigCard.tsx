import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import { gameConfigCloneTexts, gameConfigsTexts } from "../../../texts/gameConfigsTexts";
import type { AnyGameConfig } from "../../projects/types";

interface ConfigSummaryItem {
  label: string;
  value: string;
}

const configActionButtonSx: SxProps<Theme> = {
  width: 42,
  height: 42,
  flexShrink: 0,
  borderRadius: 1.75,
  bgcolor: "rgba(79, 70, 229, 0.1)",
  color: "primary.main",
  "&:hover": { bgcolor: "rgba(79, 70, 229, 0.16)" },
};

function getSummaryItems(config: AnyGameConfig): ConfigSummaryItem[] {
  switch (config.gameType) {
    case "journey":
      return [
        { label: gameConfigsTexts.card.summary.journey.field, value: gameConfigsTexts.card.summary.journey.fieldValue(config.summary.mapSize) },
        { label: gameConfigsTexts.card.summary.journey.turn, value: config.summary.diceRange },
        { label: gameConfigsTexts.card.summary.journey.jackpot, value: config.summary.jackpot },
        { label: gameConfigsTexts.card.summary.journey.events, value: gameConfigsTexts.card.summary.journey.eventsValue(config.summary.bonusKinds, config.summary.trapKinds) },
      ];
    case "battleships":
      return [
        { label: gameConfigsTexts.card.summary.battleships.field, value: `${config.summary.boardSize}×${config.summary.boardSize}` },
        { label: gameConfigsTexts.card.summary.battleships.shots, value: String(config.summary.maxShots) },
        { label: gameConfigsTexts.card.summary.battleships.hit, value: config.summary.hitPrizeLabel },
        { label: gameConfigsTexts.card.summary.battleships.fleet, value: config.summary.fleet.join(", ") },
      ];
    case "lotto":
      return [
        { label: gameConfigsTexts.card.summary.lotto.range, value: config.summary.range },
        { label: gameConfigsTexts.card.summary.lotto.card, value: gameConfigsTexts.card.summary.lotto.cardValue(config.summary.cardNumbersAmount) },
        { label: gameConfigsTexts.card.summary.lotto.firstPlace, value: config.summary.firstPlacePrizeLabel },
        { label: gameConfigsTexts.card.summary.lotto.secondPlace, value: config.summary.secondPlacePrizeLabel },
      ];
  }
}

interface GameConfigCardProps {
  config: AnyGameConfig;
  canEdit: boolean;
  onOpen: (config: AnyGameConfig) => void;
  onClone: (config: AnyGameConfig) => void;
}

export default function GameConfigCard({ config, canEdit, onOpen, onClone }: GameConfigCardProps) {
  const summaryItems = getSummaryItems(config);
  const editAriaLabel = gameConfigsTexts.card.editAriaLabel(config.name);
  const cloneAriaLabel = gameConfigCloneTexts.ariaLabel(config.name);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">{config.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{config.description || gameConfigsTexts.card.noDescription}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={cloneAriaLabel}>
              <IconButton aria-label={cloneAriaLabel} onClick={() => onClone(config)} sx={configActionButtonSx}>
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={canEdit ? editAriaLabel : "Открыть конфиг для просмотра"}>
              <IconButton aria-label={editAriaLabel} onClick={() => onOpen(config)} sx={configActionButtonSx}>
                {canEdit ? <EditRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          {config.isSystem ? <Chip size="small" label="Системный" color="secondary" /> : <Chip size="small" label={canEdit ? "Мой конфиг" : "Чужой конфиг"} color={canEdit ? "primary" : "default"} />}
        </Stack>

        <AppResponsiveGrid columns={{ xs: 1, sm: 2 }} gap={1} sx={{ mt: 0.75 }}>
          {summaryItems.map((item) => (
            <Box key={item.label} sx={{ minHeight: 54, px: 1.25, py: 0.875, border: "1px solid", borderColor: "divider", borderRadius: 1.75, bgcolor: "rgba(248, 250, 252, 0.8)" }}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25, overflowWrap: "anywhere" }}>{item.value}</Typography>
            </Box>
          ))}
        </AppResponsiveGrid>

        <Box sx={{ mt: "auto", pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{gameConfigsTexts.card.appliesToNewGames}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
