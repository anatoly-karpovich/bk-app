import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Card, CardContent, Divider, Snackbar, Stack, Typography } from "@mui/material";
import { useState } from "react";
import GameActionButton from "../../../components/GameActionButton";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { LottoBingoPageModel } from "../types";

interface Props {
  game: LottoBingoPageModel;
  busy: boolean;
  onDraw: () => void;
  onConfirmDraw: () => void;
  onUndo: () => void;
  onFinalize: () => void;
  observing: boolean;
  onToggleObservation: () => void;
}

export default function LottoBingoDrawWorkspace({ game, busy, onDraw, onConfirmDraw, onUndo, onFinalize, observing, onToggleObservation }: Props) {
  const { draw, round } = game.state;
  const { access } = game.meta;
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const drawnNumbers = new Set(draw.drawnNumbers);
  const recentNumbers = draw.drawnNumbers.slice(-10);
  const copyDrawnNumbers = async (count: number | null) => {
    const values = count === null ? draw.drawnNumbers : draw.drawnNumbers.slice(-count);
    if (!values.length) return;
    try {
      await navigator.clipboard.writeText(values.join(", "));
      setCopyMessage(
        count === null ? `Скопированы все ${values.length} номеров` : `Скопированы последние ${values.length} номеров`,
      );
    } catch {
      setCopyMessage("Не удалось скопировать номера");
    }
  };

  return (
    <>
      <AppResponsiveGrid columns={{ xs: 1, lg: 3 }} gap={3}>
        <Card sx={{ gridColumn: { lg: "span 1" } }}>
          <CardContent sx={{ p: { xs: 2.25, md: 2.5 }, height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="h5">Текущий номер</Typography>
              {access.mode === "read_only" ? (
                <AppPillButton
                  size="small"
                  variant="outlined"
                  startIcon={observing ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  disabled={busy}
                  onClick={onToggleObservation}
                  sx={{ flexShrink: 0 }}
                >
                  {observing ? "Прекратить" : "Следить"}
                </AppPillButton>
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Главное действие ведущего во время эфира.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row", lg: "column", xl: "row" }}
              spacing={1.75}
              alignItems="center"
              sx={{ flex: 1, py: 1.75 }}
            >
              <Box
                sx={{
                  width: 124,
                  height: 124,
                  flexShrink: 0,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid",
                  borderColor: "primary.light",
                  background: "radial-gradient(circle at 32% 25%, #ffffff 0%, #f5f7ff 42%, #e4e8ff 100%)",
                  boxShadow: "inset 0 0 0 8px rgba(255,255,255,.72), 0 12px 24px rgba(79,70,229,.12)",
                }}
              >
                <Typography variant="h2" sx={{ fontSize: "3rem", fontWeight: 800 }}>
                  {draw.currentBarrel ?? "—"}
                </Typography>
              </Box>
              <Stack
                spacing={1}
                sx={{
                  minWidth: 0,
                  flex: { sm: 1, lg: "initial", xl: 1 },
                  alignSelf: { sm: "stretch", lg: "auto", xl: "stretch" },
                  justifyContent: { sm: "center", lg: "initial", xl: "center" },
                  alignItems: { sm: "center", lg: "initial", xl: "center" },
                  textAlign: { sm: "center", lg: "left", xl: "center" },
                }}
              >
                <Typography fontWeight={800}>
                  {draw.drawnCount}-й бочонок из {draw.plannedDrawCount}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <AppChip size="small" label={`Осталось: ${draw.plannedRemainingCount}`} />
                  <AppChip size="small" label={`Вне игры: ${draw.outOfGameCount}`} />
                </Stack>
                {/* <Typography variant="body2" color="text.secondary">
                  После объявления номера проверьте кандидатов и чат. Следующий номер можно вытянуть даже без
                  подтверждения победителя.
                </Typography> */}
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <GameActionButton
                label="Вытянуть бочонок"
                icon={<CasinoRoundedIcon />}
                disabled={busy || !access.canDraw}
                onClick={round.requiresDrawWithoutWinnerConfirmation ? onConfirmDraw : onDraw}
                variant="contained"
              />
              {access.canUndoDraw ? (
                <GameActionButton label="Отменить" icon={<UndoRoundedIcon />} disabled={busy} onClick={onUndo} />
              ) : null}
              {access.canFinalize ? (
                <GameActionButton
                  label="Финализировать"
                  icon={<CheckCircleRoundedIcon />}
                  disabled={busy}
                  onClick={onFinalize}
                />
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ gridColumn: { lg: "span 2" }, minWidth: 0 }}>
          <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
            <Typography variant="h5">Тираж 1–90</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Выпавшие номера видны сразу; последний выделен отдельно.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, 40px)",
                gap: 0.6,
                justifyContent: "start",
                mt: 2,
              }}
            >
              {Array.from({ length: 90 }, (_, index) => index + 1).map((number) => {
                const isCurrent = number === draw.currentBarrel;
                const isDrawn = drawnNumbers.has(number);
                return (
                  <Box
                    key={number}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      color: isCurrent ? "text.primary" : isDrawn ? "common.white" : "text.disabled",
                      bgcolor: isCurrent ? "#fff1a8" : isDrawn ? "primary.main" : "#fafafa",
                      border: "1px solid",
                      borderColor: isCurrent ? "#e6b600" : isDrawn ? "primary.main" : "#dde1e7",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(234,179,8,.18)" : "none",
                    }}
                  >
                    {number}
                  </Box>
                );
              })}
            </Box>
            <Divider sx={{ my: 1.75 }} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
              <Typography variant="subtitle1" color="text.secondary" sx={{ minWidth: 84 }}>
                Последние 10:
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {recentNumbers.map((number, index) => {
                  const isLast = index === recentNumbers.length - 1;
                  return (
                    <Box
                      key={`${number}-${index}`}
                      sx={{
                        minWidth: 34,
                        height: 34,
                        px: 0.75,
                        borderRadius: 99,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        border: "1px solid",
                        borderColor: isLast ? "#e6b600" : "divider",
                        bgcolor: isLast ? "#fff8d7" : "common.white",
                      }}
                    >
                      {number}
                    </Box>
                  );
                })}
              </Stack>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ ml: { sm: "auto" } }}>
                <Typography variant="subtitle1" sx={{ ml: 1, mr: 1 }}>
                  Копировать:
                </Typography>
                <AppPillButton
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                  disabled={!draw.drawnNumbers.length}
                  onClick={() => void copyDrawnNumbers(5)}
                >
                  5
                </AppPillButton>
                {[10, 20].map((count) => (
                  <AppPillButton
                    key={count}
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                    disabled={!draw.drawnNumbers.length}
                    onClick={() => void copyDrawnNumbers(count)}
                  >
                    {count}
                  </AppPillButton>
                ))}
                <AppPillButton
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                  disabled={!draw.drawnNumbers.length}
                  onClick={() => void copyDrawnNumbers(null)}
                >
                  Все
                </AppPillButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </AppResponsiveGrid>
      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={2200}
        onClose={() => setCopyMessage(null)}
        message={copyMessage}
      />
    </>
  );
}
