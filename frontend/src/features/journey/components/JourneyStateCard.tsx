import { Fragment, useMemo, useState } from "react";
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
import { getCollectorTargetLabel, getHistoryEntrySummary, getJourneyPlayerBalanceLabel } from "../journey-page.helpers";
import { journeyTexts } from "../../../texts/journeyTexts";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import type {
  JourneyAchievementsMap,
  JourneyAchievementProgress,
  JourneyCurrencyDefinition,
  JourneyPageGame,
  JourneyCollectorTarget,
  JourneyTimelineEntry,
} from "../types";

interface JourneyStateCardProps {
  game: JourneyPageGame | null;
  playerTimelines: Record<string, JourneyTimelineEntry[]>;
  journeyAchievements: JourneyAchievementsMap;
  journeyCurrencies: JourneyCurrencyDefinition[];
  collectorTargets: JourneyCollectorTarget[];
  achievementProgressByPlayerId: Record<string, JourneyAchievementProgress>;
  isAddingForumState: boolean;
  onGetForumState: () => void;
}

export default function JourneyStateCard({
  game,
  playerTimelines,
  journeyAchievements,
  journeyCurrencies,
  collectorTargets,
  achievementProgressByPlayerId,
  isAddingForumState,
  onGetForumState,
}: JourneyStateCardProps) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const collectorTargetsById = useMemo(
    () =>
      Object.fromEntries(
        collectorTargets.map((target) => [target.id, getCollectorTargetLabel(target, journeyCurrencies)]),
      ),
    [collectorTargets, journeyCurrencies],
  );
  const jackpotWinnerNicknames = useMemo(
    () =>
      new Set(
        Object.values(game?.map ?? {})
          .filter((cell) => cell.isJackpot && cell.winner?.nickname)
          .map((cell) => cell.winner!.nickname),
      ),
    [game?.map],
  );

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" component="span">
              {journeyTexts.cards.stateTitle}
            </Typography>
            <AppPillButton
              size="small"
              variant="outlined"
              onClick={onGetForumState}
              disabled={!game}
              loading={isAddingForumState}
            >
              {journeyTexts.actions.getForumState}
            </AppPillButton>
          </Stack>
        }
        subheader={journeyTexts.cards.stateSubtitle}
      />
      <CardContent>
        {game ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={56}></TableCell>
                <TableCell>{journeyTexts.table.player}</TableCell>
                <TableCell align="right">{journeyTexts.table.cell}</TableCell>
                <TableCell align="right">Баланс</TableCell>
                <TableCell align="right">{journeyTexts.table.achievements}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {game.players.map((player) => {
                const isExpanded = expandedPlayerId === player.id;
                const timeline = playerTimelines[player.id] ?? [];
                const achievementProgress = achievementProgressByPlayerId[player.id];

                return (
                  <Fragment key={player.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton size="small" onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}>
                          {isExpanded ? (
                            <ExpandLessRoundedIcon fontSize="small" />
                          ) : (
                            <ExpandMoreRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600}>{player.nickname}</Typography>
                          {jackpotWinnerNicknames.has(player.nickname) ? (
                            <AppChip size="small" color="warning" label={journeyTexts.table.treasure} />
                          ) : null}
                          {player.status === "removed" ? (
                            <AppChip size="small" color="default" label={journeyTexts.table.removed} />
                          ) : null}
                          {player.status === "finished" ? (
                            <AppChip size="small" color="success" label={journeyTexts.table.finish} />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{player.position}</TableCell>
                      <TableCell align="right">[{getJourneyPlayerBalanceLabel(player, journeyCurrencies)}]</TableCell>
                      <TableCell align="right">
                        {player.bonuses.length}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? undefined : 0 }}>
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
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      spacing={1}
                                      justifyContent="space-between"
                                    >
                                      <Typography variant="body2" fontWeight={700}>
                                        {journeyAchievements.COLLECTOR.title}
                                      </Typography>
                                      <AppChip
                                        size="small"
                                        color={achievementProgress.collector.achieved ? "success" : "default"}
                                        label={
                                          achievementProgress.collector.achieved
                                            ? journeyTexts.progress.obtained
                                            : `${achievementProgress.collector.obtainedCellIds.length} ${journeyTexts.progress.of} ${collectorTargets.length}`
                                        }
                                      />
                                    </Stack>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mt: 1, display: "block" }}
                                    >
                                      {journeyTexts.progress.obtained}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                      {achievementProgress.collector.obtainedCellIds.length ? (
                                        achievementProgress.collector.obtainedCellIds.map((cellId) => (
                                          <AppChip
                                            key={`${player.id}-obtained-${cellId}`}
                                            size="small"
                                            color="success"
                                            label={collectorTargetsById[cellId] ?? cellId}
                                          />
                                        ))
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          {journeyTexts.progress.nothingYet}
                                        </Typography>
                                      )}
                                    </Stack>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mt: 1, display: "block" }}
                                    >
                                      {journeyTexts.progress.missing}:
                                    </Typography>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                      {achievementProgress.collector.missingCellIds.length ? (
                                        achievementProgress.collector.missingCellIds.map((cellId) => (
                                          <AppChip
                                            key={`${player.id}-missing-${cellId}`}
                                            size="small"
                                            variant="outlined"
                                            label={collectorTargetsById[cellId] ?? cellId}
                                          />
                                        ))
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          {journeyTexts.progress.allCollected}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>

                                  {[
                                    {
                                      key: "unlucky",
                                      meta: journeyAchievements.UNLUCKY,
                                      data: achievementProgress.unlucky,
                                    },
                                    {
                                      key: "careful",
                                      meta: journeyAchievements.CAREFUL,
                                      data: achievementProgress.careful,
                                    },
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
                                      <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        spacing={1}
                                        justifyContent="space-between"
                                      >
                                        <Typography variant="body2" fontWeight={700}>
                                          {meta.title}
                                        </Typography>
                                        <AppChip
                                          size="small"
                                          color={data.achieved ? "success" : "default"}
                                          label={
                                            data.achieved
                                              ? journeyTexts.progress.obtained
                                              : journeyTexts.progress.inProgress
                                          }
                                        />
                                      </Stack>
                                      <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                                        <Typography variant="body2">
                                          {journeyTexts.progress.currentSeries}: {data.current}{" "}
                                          {journeyTexts.progress.of} {data.target}
                                        </Typography>
                                        <Typography variant="body2">
                                          {journeyTexts.progress.maximum}: {data.best} {journeyTexts.progress.of}{" "}
                                          {data.target}
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
                                        <Typography variant="body2">
                                          {getHistoryEntrySummary(entry, journeyCurrencies)}
                                        </Typography>
                                        {entry.achievementsAwarded?.length ? (
                                          <Stack
                                            direction="row"
                                            spacing={0.75}
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mt: 0.75 }}
                                          >
                                            {entry.achievementsAwarded.map((achievement) => (
                                              <AppChip
                                                key={`${player.id}-${achievement.name}-${index}`}
                                                size="small"
                                                color="secondary"
                                                label={achievement.title}
                                              />
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
