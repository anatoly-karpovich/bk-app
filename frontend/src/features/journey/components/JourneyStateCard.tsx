import { Fragment, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { getAchievementProgress, getHistoryEntrySummary, getJourneyPlayerFullPrize, getPrizeBadgeLabel } from "../journey-page.helpers";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import type { JourneyAchievementsMap, JourneyPersistedGame, JourneyTimelineEntry } from "../types";

interface JourneyStateCardProps {
  game: JourneyPersistedGame | null;
  playerTimelines: Record<string, JourneyTimelineEntry[]>;
  journeyAchievements: JourneyAchievementsMap;
  nonJackpotPrizes: number[];
  finishPosition: number;
}

export default function JourneyStateCard({
  game,
  playerTimelines,
  journeyAchievements,
  nonJackpotPrizes,
  finishPosition,
}: JourneyStateCardProps) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title={journeyTexts.cards.stateTitle} subheader={journeyTexts.cards.stateSubtitle} />
      <CardContent>
        {game ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={56}></TableCell>
                <TableCell>{journeyTexts.table.player}</TableCell>
                <TableCell align="right">{journeyTexts.table.cell}</TableCell>
                <TableCell align="right">{journeyTexts.table.base}</TableCell>
                <TableCell align="right">{journeyTexts.table.withBonuses}</TableCell>
                <TableCell align="right">{journeyTexts.table.achievements}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {game.players.map((player) => {
                const isExpanded = expandedPlayerId === player.id;
                const timeline = playerTimelines[player.id] ?? [];
                const achievementProgress = getAchievementProgress(
                  player,
                  timeline,
                  nonJackpotPrizes,
                  journeyAchievements,
                  finishPosition,
                );

                return (
                  <Fragment key={player.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton size="small" onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}>
                          {isExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600}>{player.nickname}</Typography>
                          {player.bonuses.some((bonus) => bonus.name === journeyAchievements.JACKPOT.name) ? (
                            <AppChip size="small" color="warning" label={journeyTexts.table.treasure} />
                          ) : null}
                          {player.status === "removed" ? <AppChip size="small" color="default" label={journeyTexts.table.removed} /> : null}
                          {player.status === "finished" ? <AppChip size="small" color="success" label={journeyTexts.table.finish} /> : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{player.position}</TableCell>
                      <TableCell align="right">{player.prize}</TableCell>
                      <TableCell align="right">{getJourneyPlayerFullPrize(player)}</TableCell>
                      <TableCell align="right">
                        {Math.max(player.bonuses.length - Number(player.bonuses.some((bonus) => bonus.name === journeyAchievements.JACKPOT.name)), 0)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, borderBottom: isExpanded ? undefined : 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, py: 1.5, backgroundColor: "rgba(15, 23, 42, 0.03)" }}>
                            <Stack spacing={2}>
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  {journeyTexts.progress.title}
                                </Typography>

                                <Stack spacing={1}>
                                  <Box
                                    sx={{
                                      p: 1.25,
                                      borderRadius: (theme) => theme.customRadii.sm,
                                      backgroundColor: "#fff",
                                      border: "1px solid rgba(15, 23, 42, 0.08)",
                                    }}
                                  >
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                      <Typography variant="body2" fontWeight={700}>
                                        {journeyAchievements.COLLECTOR.title}
                                      </Typography>
                                      <AppChip
                                        size="small"
                                        color={achievementProgress.collector.achieved ? "success" : "default"}
                                        label={
                                          achievementProgress.collector.achieved
                                            ? journeyTexts.progress.obtained
                                            : `${achievementProgress.collector.obtainedPrizes.length} ${journeyTexts.progress.of} ${nonJackpotPrizes.length}`
                                        }
                                      />
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                      {journeyTexts.progress.obtained}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                      {achievementProgress.collector.obtainedPrizes.length ? (
                                        achievementProgress.collector.obtainedPrizes.map((prize) => (
                                          <AppChip key={`${player.id}-obtained-${prize}`} size="small" color="success" label={getPrizeBadgeLabel(prize)} />
                                        ))
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          {journeyTexts.progress.nothingYet}
                                        </Typography>
                                      )}
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                      {journeyTexts.progress.missing}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                      {achievementProgress.collector.missingPrizes.length ? (
                                        achievementProgress.collector.missingPrizes.map((prize) => (
                                          <AppChip key={`${player.id}-missing-${prize}`} size="small" variant="outlined" label={getPrizeBadgeLabel(prize)} />
                                        ))
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          {journeyTexts.progress.allCollected}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>

                                  {[
                                    { key: "unlucky", meta: journeyAchievements.UNLUCKY, data: achievementProgress.unlucky },
                                    { key: "careful", meta: journeyAchievements.CAREFUL, data: achievementProgress.careful },
                                    { key: "lucky", meta: journeyAchievements.LUCKY, data: achievementProgress.lucky },
                                  ].map(({ key, meta, data }) => (
                                    <Box
                                      key={`${player.id}-${key}`}
                                      sx={{
                                        p: 1.25,
                                        borderRadius: (theme) => theme.customRadii.sm,
                                        backgroundColor: "#fff",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                      }}
                                    >
                                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                                        <Typography variant="body2" fontWeight={700}>
                                          {meta.title}
                                        </Typography>
                                        <AppChip
                                          size="small"
                                          color={data.achieved ? "success" : "default"}
                                          label={data.achieved ? journeyTexts.progress.obtained : journeyTexts.progress.inProgress}
                                        />
                                      </Stack>
                                      <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                                        <Typography variant="body2">
                                          {journeyTexts.progress.currentSeries}: {data.current} {journeyTexts.progress.of} {data.target}
                                        </Typography>
                                        <Typography variant="body2">
                                          {journeyTexts.progress.maximum}: {data.best} {journeyTexts.progress.of} {data.target}
                                        </Typography>
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>

                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  {journeyTexts.progress.historyTitle}
                                </Typography>
                                {timeline.length ? (
                                  <Stack spacing={0.75}>
                                    {[...timeline].reverse().map((entry, index) => (
                                      <Box
                                        key={`${player.id}-${entry.createdAt}-${index}`}
                                        sx={{
                                          p: 1,
                                          borderRadius: (theme) => theme.customRadii.sm,
                                          backgroundColor: "#fff",
                                          border: "1px solid rgba(15, 23, 42, 0.08)",
                                        }}
                                      >
                                        <Typography variant="body2">{getHistoryEntrySummary(entry)}</Typography>
                                        {entry.achievementsAwarded?.length ? (
                                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                                            {entry.achievementsAwarded.map((achievement) => (
                                              <AppChip key={`${player.id}-${achievement.name}-${index}`} size="small" color="secondary" label={achievement.title} />
                                            ))}
                                          </Stack>
                                        ) : null}
                                      </Box>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    {journeyTexts.progress.historyEmpty}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Alert severity="info">{journeyTexts.alerts.createOrRestoreGame}</Alert>
        )}
      </CardContent>
    </Card>
  );
}
