import { useState } from "react";
import { Avatar, Box, Card, CardContent, CardHeader, Divider, Fade, Paper, Popper, Stack, Typography } from "@mui/material";
import {
  formatJourneyCurrencyValues,
  getCompactCellLabel,
  getCompactCellTone,
  getJourneyCellLabel,
  getJourneyMapCell,
  getJourneyVisiblePlayers,
  hasNegativeJourneyRewards,
  hasPositiveJourneyRewards,
  shortenNickname,
} from "../journey-page.helpers";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import type { HoveredCellState, JourneyConfig, JourneyPageGame, JourneyPlayerReadModel } from "../types";

interface JourneyMapCardProps {
  game: JourneyPageGame | null;
  journeyConfig: JourneyConfig;
}

function getPlayersOnCell(game: JourneyPageGame | null, index: number): JourneyPlayerReadModel[] {
  if (!game) {
    return [];
  }

  return getJourneyVisiblePlayers(game).filter((player) => player.position === index);
}

export default function JourneyMapCard({ game, journeyConfig }: JourneyMapCardProps) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCellState | null>(null);

  return (
    <Card>
      <CardHeader
        title={journeyTexts.cards.mapTitle}
        subheader={`${journeyTexts.cards.mapSubtitlePrefix} ${journeyConfig.mapSize} ${journeyTexts.cards.mapSubtitleSuffix}`}
      />
      <CardContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <AppChip size="small" label={journeyTexts.mapLegend.empty} variant="outlined" />
          <AppChip size="small" label={journeyTexts.mapLegend.bonus} color="success" variant="outlined" />
          <AppChip size="small" label={journeyTexts.mapLegend.trap} color="error" variant="outlined" />
          <AppChip size="small" label={journeyTexts.mapLegend.treasure} color="warning" variant="outlined" />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 72px)",
            columnGap: { xs: 0.75, md: 1.25 },
            rowGap: { xs: 0.75, md: 1.25 },
            justifyContent: "space-between",
            overflowX: "auto",
          }}
        >
          {Array.from({ length: journeyConfig.mapSize }, (_, index) => index + 1).map((cellIndex) => {
            const cell = game ? getJourneyMapCell(cellIndex, game.map) : null;
            const playersOnCell = getPlayersOnCell(game, cellIndex);
            const tone = getCompactCellTone(cell);

            return (
              <Paper
                key={cellIndex}
                variant="outlined"
                onMouseEnter={(event) =>
                  setHoveredCell({
                    anchorEl: event.currentTarget,
                    cellIndex,
                    cell,
                    playersOnCell,
                  })
                }
                onMouseLeave={() => setHoveredCell((current) => (current?.cellIndex === cellIndex ? null : current))}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: (theme) => theme.customRadii.control,
                  p: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: tone.borderColor,
                  backgroundColor: tone.backgroundColor,
                  color: tone.color,
                  cursor: "default",
                }}
              >
                <Typography variant="caption" sx={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                  {cellIndex}
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "center", fontWeight: 700 }}>
                  {getCompactCellLabel(cell, journeyConfig.currencies)}
                </Typography>
                <Stack direction="row" spacing={0.25} justifyContent="center" flexWrap="wrap" useFlexGap>
                  {playersOnCell.slice(0, 3).map((player) => (
                    <Avatar key={player.id} sx={{ width: 18, height: 18, fontSize: 10 }}>
                      {player.nickname.slice(0, 1).toUpperCase()}
                    </Avatar>
                  ))}
                  {playersOnCell.length > 3 ? <AppChip size="small" label={`+${playersOnCell.length - 3}`} /> : null}
                </Stack>
              </Paper>
            );
          })}
        </Box>

        <Popper open={Boolean(hoveredCell?.anchorEl)} anchorEl={hoveredCell?.anchorEl} placement="top" transition>
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={120}>
              <Paper sx={{ p: 2, width: 320, borderRadius: (theme) => theme.customRadii.md, boxShadow: 8 }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>
                      {journeyTexts.hover.cellPrefix} {hoveredCell?.cellIndex}
                    </Typography>
                    <AppChip
                      size="small"
                      label={getJourneyCellLabel(hoveredCell?.cell, journeyConfig.currencies)}
                      color={
                        hoveredCell?.cell?.isJackpot
                          ? "warning"
                          : hoveredCell?.cell && hasPositiveJourneyRewards(hoveredCell.cell.rewards)
                            ? "success"
                            : hoveredCell?.cell && hasNegativeJourneyRewards(hoveredCell.cell.rewards)
                              ? "error"
                              : "default"
                      }
                      variant="outlined"
                    />
                  </Stack>

                  {hoveredCell?.cell?.isJackpot ? (
                    <Typography variant="body2" color="text.secondary">
                      {hoveredCell.cell?.winner?.nickname
                        ? `${journeyTexts.hover.jackpotFoundPrefix} ${hoveredCell.cell.winner.nickname}. ${formatJourneyCurrencyValues(hoveredCell.cell.rewards, journeyConfig.currencies, {
                            showPlus: true,
                            includeZero: false,
                          })}.`
                        : `${journeyTexts.hover.jackpotNotFound} ${formatJourneyCurrencyValues(hoveredCell.cell.rewards, journeyConfig.currencies, {
                            showPlus: true,
                            includeZero: false,
                          })}.`}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {hoveredCell?.cell
                        ? `${hoveredCell.cell.kind === "bonus" ? journeyTexts.hover.bonusPrefix : journeyTexts.hover.trapPrefix} ${formatJourneyCurrencyValues(hoveredCell.cell.rewards, journeyConfig.currencies, {
                            showPlus: hoveredCell.cell.kind === "bonus",
                            includeZero: false,
                          })}.`
                        : journeyTexts.hover.cellEmpty}
                    </Typography>
                  )}

                  <Divider />

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {journeyTexts.hover.playersOnCell}
                    </Typography>
                    {hoveredCell?.playersOnCell?.length ? (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                        {hoveredCell.playersOnCell.map((player) => (
                          <AppChip key={player.id} size="small" color="primary" label={shortenNickname(player.nickname)} />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {journeyTexts.hover.noPlayersOnCell}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Fade>
          )}
        </Popper>
      </CardContent>
    </Card>
  );
}
